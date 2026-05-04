import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Agenda, WorkingHours } from './entities/agenda.entity';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

@Injectable()
export class AgendasService {
  private readonly logger = new Logger(AgendasService.name);

  constructor(
    @InjectRepository(Agenda)
    private readonly agendaRepo: Repository<Agenda>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly tenant: TenantContext,
  ) {}

  // ── Agendas ──────────────────────────────────────────────────────────────

  async create(dto: CreateAgendaDto): Promise<Agenda> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const agenda = this.agendaRepo.create({
      ...dto,
      workspaceId,
      services: dto.services ?? [],
      isActive: dto.isActive ?? true,
    });
    return this.agendaRepo.save(agenda);
  }

  async findAll(onlyActive?: boolean): Promise<Agenda[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const qb = this.agendaRepo
      .createQueryBuilder('a')
      .where('a."workspaceId" = :workspaceId', { workspaceId })
      .orderBy('a.name', 'ASC');
    if (onlyActive) qb.andWhere('a."isActive" = true');
    return qb.getMany();
  }

  async findOne(id: string): Promise<Agenda> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const agenda = await this.agendaRepo.findOne({
      where: { id, workspaceId },
    });
    if (!agenda) throw new NotFoundException(`Agenda ${id} não encontrada`);
    return agenda;
  }

  async update(id: string, dto: UpdateAgendaDto): Promise<Agenda> {
    const agenda = await this.findOne(id);
    Object.assign(agenda, dto);
    return this.agendaRepo.save(agenda);
  }

  async remove(id: string): Promise<void> {
    const agenda = await this.findOne(id);
    await this.agendaRepo.remove(agenda);
  }

  // ── Slots ─────────────────────────────────────────────────────────────────

  async getAvailableSlots(agendaId: string, date: string): Promise<string[]> {
    const agenda = await this.findOne(agendaId);
    if (!agenda.workingHours) return [];

    const targetDate = new Date(date + 'T00:00:00');
    const dayKey = DAY_KEYS[targetDate.getDay()];
    const blocks = agenda.workingHours[dayKey] ?? [];
    if (!blocks.length) return [];

    const slotMin = agenda.workingHours.slot_duration_min || 30;

    // Load existing appointments for the day
    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');
    const booked = await this.appointmentRepo.find({
      where: {
        agendaId,
        workspaceId: agenda.workspaceId,
        startAt: Between(dayStart, dayEnd),
      },
    });
    const busy = booked
      .filter((a) => a.status !== AppointmentStatus.CANCELLED)
      .map((a) => ({
        start: this.toMinutes(this.toLocalTime(a.startAt, agenda.workingHours!.timezone)),
        end: this.toMinutes(this.toLocalTime(a.endAt, agenda.workingHours!.timezone)),
      }));

    const now = new Date();
    const isToday = date === now.toISOString().slice(0, 10);
    const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() + 30 : 0;

    const free: string[] = [];
    for (const block of blocks) {
      let cursor = this.toMinutes(block.start);
      const blockEnd = this.toMinutes(block.end);
      while (cursor + slotMin <= blockEnd) {
        if (cursor >= nowMin) {
          const slotEnd = cursor + slotMin;
          const overlap = busy.some((b) => cursor < b.end && slotEnd > b.start);
          if (!overlap) free.push(this.fromMinutes(cursor));
        }
        cursor += slotMin;
      }
    }
    return free;
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  async createAppointment(
    agendaId: string,
    dto: CreateAppointmentDto,
    createdById?: string,
  ): Promise<Appointment> {
    const agenda = await this.findOne(agendaId);
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);

    // Conflict check — no double-booking for same slot
    const conflict = await this.appointmentRepo
      .createQueryBuilder('ap')
      .where('ap."agendaId" = :agendaId', { agendaId })
      .andWhere('ap.status != :cancelled', { cancelled: AppointmentStatus.CANCELLED })
      .andWhere('ap."startAt" < :end AND ap."endAt" > :start', { start, end })
      .getOne();
    if (conflict) {
      throw new ConflictException('Horário indisponível — já existe um agendamento nesse intervalo');
    }

    const appointment = this.appointmentRepo.create({
      ...dto,
      agendaId,
      workspaceId: agenda.workspaceId,
      startAt: start,
      endAt: end,
      createdById: createdById ?? null,
    });
    return this.appointmentRepo.save(appointment);
  }

  async listAppointments(
    agendaId: string,
    query: QueryAppointmentsDto,
  ): Promise<Appointment[]> {
    await this.findOne(agendaId); // ownership check
    const qb = this.appointmentRepo
      .createQueryBuilder('ap')
      .where('ap."agendaId" = :agendaId', { agendaId })
      .orderBy('ap."startAt"', 'ASC');

    if (query.from) qb.andWhere('ap."startAt" >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('ap."startAt" <= :to', { to: new Date(query.to) });
    if (query.status) qb.andWhere('ap.status = :status', { status: query.status });
    if (query.contactId) qb.andWhere('ap."contactId" = :cid', { cid: query.contactId });
    if (query.leadId) qb.andWhere('ap."leadId" = :lid', { lid: query.leadId });

    return qb.getMany();
  }

  async cancelAppointment(agendaId: string, appointmentId: string): Promise<Appointment> {
    const appt = await this.appointmentRepo.findOne({
      where: { id: appointmentId, agendaId },
    });
    if (!appt) throw new NotFoundException(`Agendamento ${appointmentId} não encontrado`);
    await this.findOne(agendaId); // workspace ownership check
    appt.status = AppointmentStatus.CANCELLED;
    return this.appointmentRepo.save(appt);
  }

  async updateAppointment(
    agendaId: string,
    appointmentId: string,
    dto: Partial<CreateAppointmentDto>,
  ): Promise<Appointment> {
    const appt = await this.appointmentRepo.findOne({
      where: { id: appointmentId, agendaId },
    });
    if (!appt) throw new NotFoundException(`Agendamento ${appointmentId} não encontrado`);
    await this.findOne(agendaId); // workspace ownership check
    if (dto.startAt) appt.startAt = new Date(dto.startAt);
    if (dto.endAt) appt.endAt = new Date(dto.endAt);
    if (dto.title !== undefined) appt.title = dto.title;
    if (dto.description !== undefined) appt.description = dto.description ?? null;
    if (dto.notes !== undefined) appt.notes = dto.notes ?? null;
    if (dto.status !== undefined) appt.status = dto.status;
    if (dto.service !== undefined) appt.service = dto.service ?? null;
    return this.appointmentRepo.save(appt);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private fromMinutes(min: number): string {
    const h = Math.floor(min / 60).toString().padStart(2, '0');
    const m = (min % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private toLocalTime(date: Date, timezone: string): string {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
        hour12: false,
      }).format(date);
    } catch {
      return this.fromMinutes(date.getUTCHours() * 60 + date.getUTCMinutes());
    }
  }
}
