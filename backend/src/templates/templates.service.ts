import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageTemplate } from './entities/template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(MessageTemplate)
    private repo: Repository<MessageTemplate>,
  ) {}

  create(dto: CreateTemplateDto, createdById: string): Promise<MessageTemplate> {
    const template = this.repo.create({ ...dto, createdById });
    return this.repo.save(template);
  }

  findAll(): Promise<MessageTemplate[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<MessageTemplate> {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Template não encontrado');
    return t;
  }

  interpolate(body: string, vars: Record<string, string>): string {
    return body.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
