import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageTemplate } from './entities/template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(MessageTemplate)
    private repo: Repository<MessageTemplate>,
    private readonly tenant: TenantContext,
  ) {}

  create(dto: CreateTemplateDto, createdById: string): Promise<MessageTemplate> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const template = this.repo.create({ ...dto, createdById, workspaceId });
    return this.repo.save(template);
  }

  findAll(): Promise<MessageTemplate[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({ where: { workspaceId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<MessageTemplate> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const t = await this.repo.findOne({ where: { id, workspaceId } });
    if (!t) throw new NotFoundException('Template não encontrado');
    return t;
  }

  interpolate(body: string, vars: Record<string, string>): string {
    return body.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.repo.delete({ id, workspaceId });
  }
}
