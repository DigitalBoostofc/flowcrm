import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LossReason } from './entities/loss-reason.entity';
import { CreateLossReasonDto } from './dto/create-loss-reason.dto';
import { UpdateLossReasonDto } from './dto/update-loss-reason.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { TenantCacheService } from '../common/cache/tenant-cache.service';

const LOSS_REASONS_CACHE_KEY = 'loss-reasons:all';
const CATALOG_TTL_MS = 120_000;

@Injectable()
export class LossReasonsService {
  constructor(
    @InjectRepository(LossReason)
    private repo: Repository<LossReason>,
    private readonly tenant: TenantContext,
    private readonly cache: TenantCacheService,
  ) {}

  findAll(): Promise<LossReason[]> {
    return this.cache.getOrSet(LOSS_REASONS_CACHE_KEY, CATALOG_TTL_MS, async () => {
      const workspaceId = this.tenant.requireWorkspaceId();
      const existing = await this.repo.find({ where: { workspaceId }, order: { label: 'ASC' } });
      if (existing.length === 0) {
        const defaults = [
          'Preço alto',
          'Escolheu concorrente',
          'Sem interesse',
          'Sem resposta',
          'Timing ruim',
          'Produto não atende',
          'Processo demorou',
        ];
        await Promise.all(defaults.map(label => this.repo.save(this.repo.create({ label, workspaceId }))));
        return this.repo.find({ where: { workspaceId }, order: { label: 'ASC' } });
      }
      return existing;
    });
  }

  async create(dto: CreateLossReasonDto): Promise<LossReason> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const existing = await this.repo.findOne({ where: { workspaceId, label: dto.label } });
    if (existing) throw new ConflictException('Motivo já existe');
    const reason = this.repo.create({ ...dto, workspaceId });
    const saved = await this.repo.save(reason);
    await this.cache.del(LOSS_REASONS_CACHE_KEY);
    return saved;
  }

  async update(id: string, dto: UpdateLossReasonDto): Promise<LossReason> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const entity = await this.repo.findOne({ where: { id, workspaceId } });
    if (!entity) throw new NotFoundException('Motivo não encontrado');
    if (dto.label !== undefined) {
      const label = dto.label.trim();
      if (!label) throw new BadRequestException('Nome inválido');
      if (label !== entity.label) {
        const dup = await this.repo.findOne({ where: { workspaceId, label } });
        if (dup) throw new ConflictException('Motivo já existe');
      }
      entity.label = label;
    }
    const saved = await this.repo.save(entity);
    await this.cache.del(LOSS_REASONS_CACHE_KEY);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const result = await this.repo.delete({ id, workspaceId });
    if (result.affected === 0) throw new NotFoundException('Motivo não encontrado');
    await this.cache.del(LOSS_REASONS_CACHE_KEY);
  }
}
