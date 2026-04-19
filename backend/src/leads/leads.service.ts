import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Lead, LeadStatus } from './entities/lead.entity';
import { Stage } from '../stages/entities/stage.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { ClassifyLeadDto } from './dto/classify-lead.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private repo: Repository<Lead>,
    @InjectRepository(Stage)
    private stageRepo: Repository<Stage>,
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,
    private eventEmitter: EventEmitter2,
    private readonly tenant: TenantContext,
  ) {}

  create(dto: CreateLeadDto, createdById?: string): Promise<Lead> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const lead = this.repo.create({
      ...dto,
      workspaceId,
      stageEnteredAt: new Date(),
      createdById: createdById ?? null,
    } as any);
    return this.repo.save(lead) as Promise<any> as Promise<Lead>;
  }

  findByPipeline(pipelineId: string, staleDays?: number): Promise<Lead[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const where: any = { pipelineId, workspaceId, archivedAt: IsNull() };
    if (staleDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - staleDays);
      where.stageEnteredAt = LessThan(cutoff);
      where.status = LeadStatus.ACTIVE;
    }
    return this.repo.find({
      where,
      relations: ['contact', 'company', 'stage', 'assignedTo', 'createdBy', 'pipeline'],
      order: { createdAt: 'ASC' },
    });
  }

  findAll(): Promise<Lead[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({
      where: { workspaceId, archivedAt: IsNull() },
      relations: ['contact', 'company', 'stage', 'assignedTo', 'createdBy', 'pipeline'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Lead> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const lead = await this.repo.findOne({
      where: { id, workspaceId },
      relations: ['contact', 'company', 'stage', 'pipeline', 'assignedTo'],
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }

  findByContactAndPipeline(contactId: string | null, pipelineId: string): Promise<Lead | null> {
    if (!contactId) return Promise.resolve(null);
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.findOne({
      where: { contactId, pipelineId, workspaceId },
      relations: ['contact', 'company', 'stage', 'pipeline', 'assignedTo'],
    });
  }

  findByExternalPhoneAndPipeline(phone: string, pipelineId: string): Promise<Lead | null> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.findOne({
      where: { externalPhone: phone, pipelineId, workspaceId, contactId: IsNull() },
      relations: ['contact', 'company', 'stage', 'pipeline', 'assignedTo'],
    });
  }

  async update(id: string, dto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.findOne(id);
    Object.assign(lead, dto);
    return this.repo.save(lead);
  }

  async updateStatus(id: string, dto: UpdateLeadStatusDto): Promise<Lead> {
    const lead = await this.findOne(id);
    lead.status = dto.status;
    if (dto.status === LeadStatus.LOST) {
      lead.lossReason = (dto.lossReason ?? null) as any;
    } else {
      lead.lossReason = null as any;
    }
    return this.repo.save(lead);
  }

  async move(id: string, stageId: string): Promise<Lead> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const existing = await this.repo.findOne({ where: { id, workspaceId } });
    if (!existing) throw new NotFoundException('Lead não encontrado');
    const previousStageId = existing.stageId;

    // Busca o pipelineId da etapa destino para atualizar junto
    const stage = await this.stageRepo.findOne({ where: { id: stageId } });
    const pipelineId = stage?.pipelineId ?? existing.pipelineId;

    await this.repo.update(
      { id, workspaceId },
      { stageId, pipelineId, stageEnteredAt: new Date() },
    );

    const updated = await this.findOne(id);
    this.eventEmitter.emit('lead.moved', { lead: updated, previousStageId, newStageId: stageId });
    return updated;
  }

  async assign(id: string, userId: string): Promise<Lead> {
    const lead = await this.findOne(id);
    lead.assignedToId = userId;
    return this.repo.save(lead);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const result = await this.repo.delete({ id, workspaceId });
    if (result.affected === 0) throw new NotFoundException('Lead não encontrado');
  }

  async archive(id: string): Promise<Lead> {
    const lead = await this.findOne(id);
    lead.archivedAt = new Date();
    return this.repo.save(lead);
  }

  async unarchive(id: string): Promise<Lead> {
    const lead = await this.findOne(id);
    lead.archivedAt = null;
    return this.repo.save(lead);
  }

  async classify(id: string, dto: ClassifyLeadDto): Promise<Lead> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const lead = await this.findOne(id);

    const phone = (dto.phone ?? lead.externalPhone ?? '').trim() || null;

    let contact: Contact | null = null;
    if (phone) {
      contact = await this.contactRepo.findOne({ where: { phone, workspaceId } });
    }
    if (!contact) {
      contact = this.contactRepo.create({
        name: dto.name.trim(),
        phone: phone ?? undefined,
        email: dto.email?.trim() || undefined,
        workspaceId,
      });
      contact = await this.contactRepo.save(contact);
    } else {
      let changed = false;
      if (!contact.name && dto.name.trim()) { contact.name = dto.name.trim(); changed = true; }
      if (!contact.email && dto.email?.trim()) { contact.email = dto.email.trim(); changed = true; }
      if (changed) contact = await this.contactRepo.save(contact);
    }

    lead.contactId = contact.id;
    lead.externalName = null;
    lead.externalPhone = null;
    await this.repo.save(lead);

    return this.findOne(id);
  }
}
