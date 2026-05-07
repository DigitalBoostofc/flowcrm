import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from './entities/label.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { TenantCacheService } from '../common/cache/tenant-cache.service';

const LABELS_KEY = 'labels:workspace';
const CATALOG_TTL_MS = 120_000;

@Injectable()
export class LabelsService {
  constructor(
    @InjectRepository(Label) private labelRepo: Repository<Label>,
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(Conversation) private convRepo: Repository<Conversation>,
    private readonly tenant: TenantContext,
    private readonly cache: TenantCacheService,
  ) {}

  findAll(): Promise<Label[]> {
    return this.cache.getOrSet(LABELS_KEY, CATALOG_TTL_MS, () => {
      const workspaceId = this.tenant.requireWorkspaceId();
      return this.labelRepo.find({
        where: { workspaceId },
        order: { position: 'ASC', createdAt: 'ASC' },
      });
    });
  }

  async create(data: { name: string; color: string }): Promise<Label> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const label = this.labelRepo.create({ ...data, workspaceId });
    const saved = await this.labelRepo.save(label);
    await this.cache.del(LABELS_KEY);
    return saved;
  }

  async update(id: string, data: Partial<{ name: string; color: string; position: number }>): Promise<Label> {
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.labelRepo.update({ id, workspaceId }, data);
    const updated = await this.labelRepo.findOne({ where: { id, workspaceId } });
    if (!updated) throw new NotFoundException('Etiqueta não encontrada');
    await this.cache.del(LABELS_KEY);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.labelRepo.delete({ id, workspaceId });
    await this.cache.del(LABELS_KEY);
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

  async addToConversation(conversationId: string, labelId: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, workspaceId },
      relations: ['labels'],
    });
    if (!conv) throw new NotFoundException('Conversa não encontrada');
    const label = await this.labelRepo.findOne({ where: { id: labelId, workspaceId } });
    if (!label) throw new NotFoundException('Etiqueta não encontrada');

    if (!conv.labels.find(l => l.id === labelId)) {
      conv.labels.push(label);
      await this.convRepo.save(conv);
    }
  }

  async removeFromConversation(conversationId: string, labelId: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, workspaceId },
      relations: ['labels'],
    });
    if (!conv) throw new NotFoundException('Conversa não encontrada');
    conv.labels = conv.labels.filter(l => l.id !== labelId);
    await this.convRepo.save(conv);
  }
}
