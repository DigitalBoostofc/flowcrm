import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { QuickReply } from './entities/quick-reply.entity';
import { CreateQuickReplyDto, UpdateQuickReplyDto } from './dto/quick-reply.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class QuickRepliesService {
  constructor(
    @InjectRepository(QuickReply) private repo: Repository<QuickReply>,
    private readonly tenant: TenantContext,
  ) {}

  findAll(search?: string): Promise<QuickReply[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    if (search) {
      return this.repo.find({
        where: [
          { workspaceId, title: ILike(`%${search}%`) },
          { workspaceId, shortcut: ILike(`%${search}%`) },
        ],
        order: { title: 'ASC' },
        take: 20,
      });
    }
    return this.repo.find({ where: { workspaceId }, order: { title: 'ASC' } });
  }

  async create(dto: CreateQuickReplyDto, userId: string): Promise<QuickReply> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const qr = this.repo.create({
      ...dto,
      shortcut: dto.shortcut ?? null,
      category: dto.category ?? null,
      workspaceId,
      createdById: userId,
    });
    return this.repo.save(qr);
  }

  async update(id: string, dto: UpdateQuickReplyDto): Promise<QuickReply> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const qr = await this.repo.findOne({ where: { id, workspaceId } });
    if (!qr) throw new NotFoundException('Resposta rápida não encontrada');
    Object.assign(qr, dto);
    return this.repo.save(qr);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.repo.delete({ id, workspaceId });
  }
}
