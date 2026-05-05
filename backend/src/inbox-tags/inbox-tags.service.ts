import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InboxTag } from './entities/inbox-tag.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class InboxTagsService {
  constructor(
    @InjectRepository(InboxTag) private repo: Repository<InboxTag>,
    private readonly tenant: TenantContext,
  ) {}

  list(): Promise<InboxTag[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({ where: { workspaceId }, order: { position: 'ASC', createdAt: 'ASC' } });
  }

  async create(dto: { name: string; color?: string }): Promise<InboxTag> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const count = await this.repo.count({ where: { workspaceId } });
    const tag = this.repo.create({ workspaceId, name: dto.name, color: dto.color ?? '#6366f1', position: count });
    return this.repo.save(tag);
  }

  async update(id: string, dto: { name?: string; color?: string; position?: number }): Promise<InboxTag> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const tag = await this.repo.findOne({ where: { id, workspaceId } });
    if (!tag) throw new NotFoundException('Tag não encontrada');
    Object.assign(tag, dto);
    return this.repo.save(tag);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const tag = await this.repo.findOne({ where: { id, workspaceId } });
    if (!tag) throw new NotFoundException('Tag não encontrada');
    await this.repo.remove(tag);
  }
}
