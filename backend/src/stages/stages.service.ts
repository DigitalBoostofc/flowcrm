import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stage } from './entities/stage.entity';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { TenantCacheService } from '../common/cache/tenant-cache.service';

const stagesKey = (pipelineId: string) => `stages:pipeline:${pipelineId}`;
const PIPELINES_CACHE_KEY = 'pipelines:all';
const CATALOG_TTL_MS = 120_000;

@Injectable()
export class StagesService {
  constructor(
    @InjectRepository(Stage)
    private repo: Repository<Stage>,
    private readonly tenant: TenantContext,
    private readonly cache: TenantCacheService,
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
    const saved = await this.repo.save(stage);
    await Promise.all([
      this.cache.del(stagesKey(pipelineId)),
      this.cache.del(PIPELINES_CACHE_KEY),
    ]);
    return saved;
  }

  async update(id: string, dto: UpdateStageDto): Promise<Stage> {
    const stage = await this.findOne(id);
    Object.assign(stage, dto);
    const saved = await this.repo.save(stage);
    await Promise.all([
      this.cache.del(stagesKey(stage.pipelineId)),
      this.cache.del(PIPELINES_CACHE_KEY),
    ]);
    return saved;
  }

  findByPipeline(pipelineId: string): Promise<Stage[]> {
    return this.cache.getOrSet(stagesKey(pipelineId), CATALOG_TTL_MS, () => {
      const workspaceId = this.tenant.requireWorkspaceId();
      return this.repo.find({ where: { pipelineId, workspaceId }, order: { position: 'ASC' } });
    });
  }

  async findOne(id: string): Promise<Stage> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const s = await this.repo.findOne({ where: { id, workspaceId } });
    if (!s) throw new NotFoundException('Etapa não encontrada');
    return s;
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const stage = await this.repo.findOne({ where: { id, workspaceId } });
    await this.repo.delete({ id, workspaceId });
    if (stage) {
      await Promise.all([
        this.cache.del(stagesKey(stage.pipelineId)),
        this.cache.del(PIPELINES_CACHE_KEY),
      ]);
    }
  }
}
