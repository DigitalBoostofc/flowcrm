import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stage } from './entities/stage.entity';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class StagesService {
  constructor(
    @InjectRepository(Stage)
    private repo: Repository<Stage>,
    private readonly tenant: TenantContext,
  ) {}

  async create(pipelineId: string, dto: CreateStageDto): Promise<Stage> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const count = await this.repo.count({ where: { pipelineId, workspaceId } });
    const stage = this.repo.create({
      ...dto,
      pipelineId,
      workspaceId,
      position: dto.position ?? count,
    });
    return this.repo.save(stage);
  }

  async update(id: string, dto: UpdateStageDto): Promise<Stage> {
    const stage = await this.findOne(id);
    Object.assign(stage, dto);
    return this.repo.save(stage);
  }

  findByPipeline(pipelineId: string): Promise<Stage[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({ where: { pipelineId, workspaceId }, order: { position: 'ASC' } });
  }

  async findOne(id: string): Promise<Stage> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const s = await this.repo.findOne({ where: { id, workspaceId } });
    if (!s) throw new NotFoundException('Etapa não encontrada');
    return s;
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.repo.delete({ id, workspaceId });
  }
}
