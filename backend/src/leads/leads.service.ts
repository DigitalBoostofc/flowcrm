import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Lead, LeadStatus } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private repo: Repository<Lead>,
    private eventEmitter: EventEmitter2,
  ) {}

  create(dto: CreateLeadDto): Promise<Lead> {
    const lead = this.repo.create({ ...dto, stageEnteredAt: new Date() });
    return this.repo.save(lead);
  }

  findByPipeline(pipelineId: string, staleDays?: number): Promise<Lead[]> {
    const where: any = { pipelineId };
    if (staleDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - staleDays);
      where.stageEnteredAt = LessThan(cutoff);
      where.status = LeadStatus.ACTIVE;
    }
    return this.repo.find({
      where,
      relations: ['contact', 'stage', 'assignedTo'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Lead> {
    const lead = await this.repo.findOne({
      where: { id },
      relations: ['contact', 'stage', 'pipeline', 'assignedTo'],
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }

  findByContactAndPipeline(contactId: string, pipelineId: string): Promise<Lead | null> {
    return this.repo.findOne({
      where: { contactId, pipelineId },
      relations: ['contact', 'stage', 'pipeline', 'assignedTo'],
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
    const lead = await this.findOne(id);
    const previousStageId = lead.stageId;
    lead.stageId = stageId;
    lead.stageEnteredAt = new Date();
    const updated = await this.repo.save(lead);
    this.eventEmitter.emit('lead.moved', { lead: updated, previousStageId, newStageId: stageId });
    return updated;
  }

  async assign(id: string, userId: string): Promise<Lead> {
    const lead = await this.findOne(id);
    lead.assignedToId = userId;
    return this.repo.save(lead);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Lead não encontrado');
  }
}
