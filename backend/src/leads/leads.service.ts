import { ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Lead, LeadStatus } from './entities/lead.entity';
import { Stage } from '../stages/entities/stage.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { ClassifyLeadDto } from './dto/classify-lead.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { LeadVisibilityPolicy } from './policies/lead-visibility.policy';
import { LeadScoringService, ScoringResult } from './scoring/lead-scoring.service';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  constructor(
    @InjectRepository(Lead)
    private repo: Repository<Lead>,
    @InjectRepository(Stage)
    private stageRepo: Repository<Stage>,
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,
    private eventEmitter: EventEmitter2,
    private readonly tenant: TenantContext,
    private readonly scoring: LeadScoringService,
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

  findByPipeline(pipelineId: string, staleDays?: number, currentUserId?: string, userRole?: string): Promise<Lead[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const qb = this.repo.createQueryBuilder('lead')
      .leftJoinAndSelect('lead.contact', 'contact')
      .leftJoinAndSelect('lead.company', 'company')
      .leftJoinAndSelect('lead.stage', 'stage')
      .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
      .leftJoinAndSelect('lead.createdBy', 'createdBy')
      .leftJoinAndSelect('lead.pipeline', 'pipeline')
      .leftJoinAndSelect('lead.labels', 'labels')
      .where('lead.pipelineId = :pipelineId', { pipelineId })
      .andWhere('lead.workspaceId = :workspaceId', { workspaceId })
      .andWhere('lead.archivedAt IS NULL')
      .andWhere('lead.deletedAt IS NULL')
      .orderBy('lead.createdAt', 'ASC');

    if (staleDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - staleDays);
      qb.andWhere('lead.stageEnteredAt < :cutoff', { cutoff })
        .andWhere('lead.status = :status', { status: LeadStatus.ACTIVE });
    }

    LeadVisibilityPolicy.applyToQueryBuilder(qb, 'lead', { userId: currentUserId, role: userRole, workspaceId });

    return qb.getMany();
  }

  findAll(currentUserId?: string, userRole?: string): Promise<Lead[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const qb = this.repo.createQueryBuilder('lead')
      .leftJoinAndSelect('lead.contact', 'contact')
      .leftJoinAndSelect('lead.company', 'company')
      .leftJoinAndSelect('lead.stage', 'stage')
      .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
      .leftJoinAndSelect('lead.createdBy', 'createdBy')
      .leftJoinAndSelect('lead.pipeline', 'pipeline')
      .leftJoinAndSelect('lead.labels', 'labels')
      .where('lead.workspaceId = :workspaceId', { workspaceId })
      .andWhere('lead.archivedAt IS NULL')
      .andWhere('lead.deletedAt IS NULL')
      .orderBy('lead.createdAt', 'DESC');

    LeadVisibilityPolicy.applyToQueryBuilder(qb, 'lead', { userId: currentUserId, role: userRole, workspaceId });

    return qb.getMany();
  }

  async findOne(id: string): Promise<Lead> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const lead = await this.repo.findOne({
      where: { id, workspaceId },
      relations: ['contact', 'company', 'stage', 'pipeline', 'assignedTo', 'labels', 'customerOrigin'],
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }

  /** Read with privacy enforcement; use this from controllers handling :id routes. */
  async findOneAccessible(id: string, currentUserId?: string, userRole?: string): Promise<Lead> {
    const lead = await this.findOne(id);
    this.assertAccessible(lead, currentUserId, userRole);
    return lead;
  }

  private assertAccessible(lead: Lead, currentUserId?: string, userRole?: string): void {
    if (LeadVisibilityPolicy.isPrivileged(userRole)) return;
    if (!currentUserId) {
      throw new ForbiddenException('Usuário não identificado para checagem de privacidade');
    }
    const ctx = { userId: currentUserId, role: userRole, workspaceId: lead.workspaceId };
    if (!LeadVisibilityPolicy.canRead(lead, ctx)) {
      // 404 to avoid revealing existence
      throw new NotFoundException('Lead não encontrado');
    }
  }

  findByContactAndPipeline(contactId: string | null, pipelineId: string): Promise<Lead | null> {
    if (!contactId) return Promise.resolve(null);
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.findOne({
      where: { contactId, pipelineId, workspaceId },
      relations: ['contact', 'company', 'stage', 'pipeline', 'assignedTo', 'labels'],
    });
  }

  findByExternalPhoneAndPipeline(phone: string, pipelineId: string): Promise<Lead | null> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.findOne({
      where: { externalPhone: phone, pipelineId, workspaceId, contactId: IsNull() },
      relations: ['contact', 'company', 'stage', 'pipeline', 'assignedTo', 'labels'],
    });
  }

  async update(id: string, dto: UpdateLeadDto, currentUserId?: string, userRole?: string): Promise<Lead> {
    const lead = await this.findOneAccessible(id, currentUserId, userRole);
    Object.assign(lead, dto);
    return this.repo.save(lead);
  }

  async updateStatus(id: string, dto: UpdateLeadStatusDto, currentUserId?: string, userRole?: string): Promise<Lead> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const lead = await this.findOneAccessible(id, currentUserId, userRole);

    const previousStatus = lead.status;
    try {
      await this.repo.update(
        { id: lead.id, workspaceId },
        {
          status: dto.status,
          lossReason: dto.status === LeadStatus.LOST ? (dto.lossReason ?? null) as any : null as any,
          freezeReason: dto.status === LeadStatus.FROZEN ? (dto.freezeReason ?? null) : null,
          frozenReturnDate: dto.status === LeadStatus.FROZEN ? (dto.frozenReturnDate ?? null) : null,
        },
      );
    } catch (err: any) {
      this.logger.error('updateStatus DB error', err?.message, err?.stack);
      throw new InternalServerErrorException('Erro ao atualizar status');
    }

    const updated = await this.findOne(id);
    if (previousStatus !== dto.status) {
      this.eventEmitter.emit('lead.statusChanged', {
        leadId: updated.id,
        workspaceId,
        previousStatus,
        newStatus: dto.status,
      });
    }
    return updated;
  }

  async move(id: string, stageId: string, currentUserId?: string, userRole?: string): Promise<Lead> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const existing = await this.findOneAccessible(id, currentUserId, userRole);
    const previousStageId = existing.stageId;

    // Busca o pipelineId da etapa destino para atualizar junto
    const stage = await this.stageRepo.findOne({ where: { id: stageId, workspaceId } });
    const pipelineId = stage?.pipelineId ?? existing.pipelineId;

    await this.repo.update(
      { id, workspaceId },
      { stageId, pipelineId, stageEnteredAt: new Date() },
    );

    const updated = await this.findOne(id);
    this.eventEmitter.emit('lead.moved', { lead: updated, previousStageId, newStageId: stageId, workspaceId });
    return updated;
  }

  async assign(id: string, userId: string, currentUserId?: string, userRole?: string): Promise<Lead> {
    const lead = await this.findOneAccessible(id, currentUserId, userRole);
    lead.assignedToId = userId;
    return this.repo.save(lead);
  }

  async setScore(id: string, score: number, currentUserId?: string, userRole?: string): Promise<Lead> {
    const lead = await this.findOneAccessible(id, currentUserId, userRole);
    lead.score = score;
    return this.repo.save(lead);
  }

  async recalculateScore(
    id: string,
    currentUserId?: string,
    userRole?: string,
  ): Promise<{ lead: Lead; result: ScoringResult }> {
    const lead = await this.findOneAccessible(id, currentUserId, userRole);
    const result = this.scoring.calculate(lead);
    lead.score = result.score;
    const saved = await this.repo.save(lead);
    return { lead: saved, result };
  }

  /** Recálculo automático em event handlers — bypassa privacy check (chamada do sistema). */
  async recalculateScoreSystem(id: string): Promise<ScoringResult | null> {
    const lead = await this.repo.findOne({ where: { id, workspaceId: this.tenant.requireWorkspaceId() } });
    if (!lead) return null;
    const result = this.scoring.calculate(lead);
    lead.score = result.score;
    await this.repo.save(lead);
    return result;
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const result = await this.repo.softDelete({ id, workspaceId });
    if (result.affected === 0) throw new NotFoundException('Lead não encontrado');
  }

  async archive(id: string, currentUserId?: string, userRole?: string): Promise<Lead> {
    const lead = await this.findOneAccessible(id, currentUserId, userRole);
    lead.archivedAt = new Date();
    return this.repo.save(lead);
  }

  async unarchive(id: string, currentUserId?: string, userRole?: string): Promise<Lead> {
    const lead = await this.findOneAccessible(id, currentUserId, userRole);
    lead.archivedAt = null;
    return this.repo.save(lead);
  }

  async classify(id: string, dto: ClassifyLeadDto, currentUserId?: string, userRole?: string): Promise<Lead> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const lead = await this.findOneAccessible(id, currentUserId, userRole);

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
