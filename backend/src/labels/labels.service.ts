import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from './entities/label.entity';
import { Lead } from '../leads/entities/lead.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class LabelsService {
  constructor(
    @InjectRepository(Label) private labelRepo: Repository<Label>,
    @InjectRepository(Lead)  private leadRepo:  Repository<Lead>,
    private readonly tenant: TenantContext,
  ) {}

  findAll(pipelineId?: string): Promise<Label[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const where: any = { workspaceId };
    if (pipelineId) where.pipelineId = pipelineId;
    else where.pipelineId = null;
    return this.labelRepo.find({ where, order: { createdAt: 'ASC' } });
  }

  create(data: { name: string; color: string; pipelineId?: string | null }): Promise<Label> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const label = this.labelRepo.create({ ...data, workspaceId, pipelineId: data.pipelineId ?? null });
    return this.labelRepo.save(label);
  }

  async update(id: string, data: Partial<{ name: string; color: string }>): Promise<Label> {
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.labelRepo.update({ id, workspaceId }, data);
    const updated = await this.labelRepo.findOne({ where: { id, workspaceId } });
    if (!updated) throw new NotFoundException('Etiqueta não encontrada');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.labelRepo.delete({ id, workspaceId });
  }

  async addToLead(leadId: string, labelId: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const lead = await this.leadRepo.findOne({
      where: { id: leadId, workspaceId },
      relations: ['labels'],
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    const label = await this.labelRepo.findOne({ where: { id: labelId, workspaceId } });
    if (!label) throw new NotFoundException('Etiqueta não encontrada');

    if (!lead.labels.find(l => l.id === labelId)) {
      lead.labels.push(label);
      await this.leadRepo.save(lead);
    }
  }

  async removeFromLead(leadId: string, labelId: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const lead = await this.leadRepo.findOne({
      where: { id: leadId, workspaceId },
      relations: ['labels'],
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    lead.labels = lead.labels.filter(l => l.id !== labelId);
    await this.leadRepo.save(lead);
  }
}
