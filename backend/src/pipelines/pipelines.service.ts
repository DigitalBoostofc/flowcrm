import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pipeline } from './entities/pipeline.entity';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { TenantCacheService } from '../common/cache/tenant-cache.service';

const PIPELINES_CACHE_KEY = 'pipelines:all';
const CATALOG_TTL_MS = 120_000;

@Injectable()
export class PipelinesService {
  constructor(
    @InjectRepository(Pipeline)
    private repo: Repository<Pipeline>,
    private readonly tenant: TenantContext,
    private readonly cache: TenantCacheService,
  ) {}

  async create(dto: CreatePipelineDto): Promise<Pipeline> {
    const workspaceId = this.tenant.requireWorkspaceId();
    if (dto.isDefault) {
      await this.repo.update({ workspaceId, isDefault: true }, { isDefault: false });
    }
    const pipeline = this.repo.create({ ...dto, workspaceId });
    const saved = await this.repo.save(pipeline);
    await this.cache.del(PIPELINES_CACHE_KEY);
    return saved;
  }

  async update(id: string, dto: UpdatePipelineDto): Promise<Pipeline> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const pipeline = await this.findOne(id);
    if (dto.isDefault) {
      await this.repo.update({ workspaceId, isDefault: true }, { isDefault: false });
    }
    Object.assign(pipeline, dto);
    const saved = await this.repo.save(pipeline);
    await this.cache.del(PIPELINES_CACHE_KEY);
    return saved;
  }

  findAll(): Promise<Pipeline[]> {
    return this.cache.getOrSet(PIPELINES_CACHE_KEY, CATALOG_TTL_MS, () => {
      const workspaceId = this.tenant.requireWorkspaceId();
      return this.repo.find({
        where: { workspaceId },
        relations: ['stages'],
        order: { createdAt: 'ASC' },
      });
    });
  }

  async findOne(id: string): Promise<Pipeline> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const p = await this.repo.findOne({ where: { id, workspaceId }, relations: ['stages'] });
    if (!p) throw new NotFoundException('Pipeline não encontrado');
    return p;
  }

  async findDefault(): Promise<Pipeline | null> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const preferred = await this.repo.findOne({
      where: { workspaceId, isDefault: true },
      relations: ['stages'],
    });
    if (preferred) return preferred;
    return this.repo.findOne({
      where: { workspaceId },
      relations: ['stages'],
      order: { createdAt: 'ASC' },
    });
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.repo.delete({ id, workspaceId });
    await this.cache.del(PIPELINES_CACHE_KEY);
  }
}
