import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pipeline } from './entities/pipeline.entity';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class PipelinesService {
  constructor(
    @InjectRepository(Pipeline)
    private repo: Repository<Pipeline>,
    private readonly tenant: TenantContext,
  ) {}

  async create(dto: CreatePipelineDto): Promise<Pipeline> {
    const workspaceId = this.tenant.requireWorkspaceId();
    if (dto.isDefault) {
      await this.repo.update({ workspaceId, isDefault: true }, { isDefault: false });
    }
    const pipeline = this.repo.create({ ...dto, workspaceId });
    return this.repo.save(pipeline);
  }

  async update(id: string, dto: UpdatePipelineDto): Promise<Pipeline> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const pipeline = await this.findOne(id);
    if (dto.isDefault) {
      await this.repo.update({ workspaceId, isDefault: true }, { isDefault: false });
    }
    Object.assign(pipeline, dto);
    return this.repo.save(pipeline);
  }

  findAll(): Promise<Pipeline[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({
      where: { workspaceId },
      relations: ['stages'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Pipeline> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const p = await this.repo.findOne({ where: { id, workspaceId }, relations: ['stages'] });
    if (!p) throw new NotFoundException('Pipeline não encontrado');
    return p;
  }

  findDefault(): Promise<Pipeline | null> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.findOne({
      where: { workspaceId, isDefault: true },
      relations: ['stages'],
    });
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.repo.delete({ id, workspaceId });
  }
}
