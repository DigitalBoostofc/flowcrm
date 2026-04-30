import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from './entities/label.entity';
import { Lead } from '../leads/entities/lead.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { TenantCacheService } from '../common/cache/tenant-cache.service';

const labelsKey = (pipelineId: string | null) => `labels:pipeline:${pipelineId ?? 'global'}`;
const CATALOG_TTL_MS = 120_000;

@Injectable()
export class LabelsService {
  constructor(
    @InjectRepository(Label) private labelRepo: Repository<Label>,
    @InjectRepository(Lead)  private leadRepo:  Repository<Lead>,
    private readonly tenant: TenantContext,
    private readonly cache: TenantCacheService,
  ) {}

  findAll(pipelineId?: string): Promise<Label[]> {
    const scopedPipelineId = pipelineId ?? null;
    return this.cache.getOrSet(labelsKey(scopedPipelineId), CATALOG_TTL_MS, () => {
      const workspaceId = this.tenant.requireWorkspaceId();
      const where: any = { workspaceId, pipelineId: scopedPipelineId };
      return this.labelRepo.find({ where, order: { createdAt: 'ASC' } });
    });
  }

  async create(data: { name: string; color: string; pipelineId?: string | null }): Promise<Label> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const pipelineId = data.pipelineId ?? null;
    const label = this.labelRepo.create({ ...data, workspaceId, pipelineId });
    const saved = await this.labelRepo.save(label);
    await this.cache.del(labelsKey(pipelineId));
    return saved;
  }

  async update(id: string, data: Partial<{ name: string; color: string }>): Promise<Label> {
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.labelRepo.update({ id, workspaceId }, data);
    const updated = await this.labelRepo.findOne({ where: { id, workspaceId } });
    if (!updated) throw new NotFoundException('Etiqueta não encontrada');
    await this.cache.del(labelsKey(updated.pipelineId ?? null));
    return updated;
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const existing = await this.labelRepo.findOne({ where: { id, workspaceId } });
    await this.labelRepo.delete({ id, workspaceId });
    if (existing) await this.cache.del(labelsKey(existing.pipelineId ?? null));
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
