import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { GoogleCalendarService } from '../integrations/google-calendar.service';

const TASK_TYPE_LABELS: Record<string, string> = {
  email: 'E-mail',
  call: 'Ligação',
  whatsapp: 'WhatsApp',
  proposal: 'Proposta',
  meeting: 'Reunião',
  visit: 'Visita',
};

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private repo: Repository<Task>,
    private readonly tenant: TenantContext,
    @Optional() private readonly googleCalendar: GoogleCalendarService,
  ) {}

  async create(dto: CreateTaskDto, createdById?: string): Promise<Task> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const task = this.repo.create({
      ...dto,
      workspaceId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      responsibleIds: dto.responsibleIds ?? [],
      attachments: dto.attachments ?? [],
      createdById: createdById ?? null,
      googleEventIds: {},
    });
    const saved = await this.repo.save(task);

    // Sync to Google Calendar (non-blocking)
    if (this.googleCalendar && saved.dueDate && saved.responsibleIds.length) {
      this.syncCreateToGoogle(saved).catch(err =>
        this.logger.warn(`Google Calendar sync falhou: ${err.message}`)
      );
    }

    return saved;
  }

  private async syncCreateToGoogle(task: Task): Promise<void> {
    const startAt = new Date(task.dueDate!);
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000); // +30 min
    const typeLabel = TASK_TYPE_LABELS[task.type] ?? task.type;
    const summary = `[${typeLabel}] ${task.description}`;
    const description = task.targetLabel ? `Relacionado: ${task.targetLabel}` : undefined;

    const eventIds: Record<string, string> = {};
    await Promise.all(
      task.responsibleIds.map(async (userId) => {
        const eventId = await this.googleCalendar.createEvent(userId, { summary, description, startAt, endAt });
        if (eventId) eventIds[userId] = eventId;
      })
    );

    if (Object.keys(eventIds).length > 0) {
      await this.repo.update(task.id, { googleEventIds: eventIds });
    }
  }

  async findAll(query: QueryTasksDto): Promise<Task[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const qb = this.repo
      .createQueryBuilder('task')
      .where('task."workspaceId" = :workspaceId', { workspaceId })
      .orderBy('task.dueDate', 'ASC', 'NULLS LAST');

    if (query.status) qb.andWhere('task.status = :status', { status: query.status });
    if (query.type) qb.andWhere('task.type = :type', { type: query.type });
    if (query.assigneeId) {
      qb.andWhere(`task.responsibleIds @> :assignee::jsonb`, {
        assignee: JSON.stringify([query.assigneeId]),
      });
    }
    if (query.targetType) qb.andWhere('task.targetType = :targetType', { targetType: query.targetType });
    if (query.targetId) qb.andWhere('task.targetId = :targetId', { targetId: query.targetId });

    const now = new Date();
    if (query.range === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      qb.andWhere('task.dueDate BETWEEN :s AND :e', { s: start, e: end });
    } else if (query.range === 'week') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 7);
      qb.andWhere('task.dueDate BETWEEN :s AND :e', { s: start, e: end });
    } else {
      if (query.dueFrom) qb.andWhere('task.dueDate >= :from', { from: new Date(query.dueFrom) });
      if (query.dueTo) qb.andWhere('task.dueDate <= :to', { to: new Date(query.dueTo) });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Task> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const task = await this.repo.findOne({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    return task;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    Object.assign(task, {
      ...dto,
      dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : task.dueDate,
    });
    return this.repo.save(task);
  }

  async complete(id: string): Promise<Task> {
    const task = await this.findOne(id);
    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date();
    return this.repo.save(task);
  }

  async cancel(id: string): Promise<Task> {
    const task = await this.findOne(id);
    task.status = TaskStatus.CANCELLED;
    return this.repo.save(task);
  }

  async reopen(id: string): Promise<Task> {
    const task = await this.findOne(id);
    task.status = TaskStatus.PENDING;
    task.completedAt = null;
    return this.repo.save(task);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const task = await this.repo.findOne({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');

    // Remove eventos do Google Calendar (non-blocking)
    if (this.googleCalendar && task.googleEventIds) {
      this.syncDeleteToGoogle(task).catch(() => {});
    }

    await this.repo.delete({ id, workspaceId });
  }

  private async syncDeleteToGoogle(task: Task): Promise<void> {
    await Promise.all(
      Object.entries(task.googleEventIds ?? {}).map(([userId, eventId]) =>
        this.googleCalendar.deleteEvent(userId, eventId)
      )
    );
  }
}
