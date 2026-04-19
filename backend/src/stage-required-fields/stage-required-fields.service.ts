import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StageRequiredField } from './entities/stage-required-field.entity';
import { CreateStageRequiredFieldDto } from './dto/create-stage-required-field.dto';
import { UpdateStageRequiredFieldDto } from './dto/update-stage-required-field.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class StageRequiredFieldsService {
  constructor(
    @InjectRepository(StageRequiredField)
    private repo: Repository<StageRequiredField>,
    private readonly tenant: TenantContext,
  ) {}

  findByStage(stageId: string): Promise<StageRequiredField[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({
      where: { stageId, workspaceId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(stageId: string, dto: CreateStageRequiredFieldDto): Promise<StageRequiredField> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const existing = await this.repo.findOne({
      where: { stageId, workspaceId, targetType: dto.targetType, fieldKey: dto.fieldKey },
    });
    if (existing) throw new ConflictException('Campo já configurado nesta etapa');
    const count = await this.repo.count({ where: { stageId, workspaceId } });
    const entity = this.repo.create({
      stageId,
      workspaceId,
      targetType: dto.targetType,
      fieldKey: dto.fieldKey,
      question: dto.question?.trim() || null,
      position: count,
    });
    return this.repo.save(entity);
  }

  async update(stageId: string, id: string, dto: UpdateStageRequiredFieldDto): Promise<StageRequiredField> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const entity = await this.repo.findOne({ where: { id, stageId, workspaceId } });
    if (!entity) throw new NotFoundException('Regra não encontrada');
    if (dto.question !== undefined) {
      entity.question = dto.question?.trim() || null;
    }
    return this.repo.save(entity);
  }

  async remove(stageId: string, id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const result = await this.repo.delete({ id, stageId, workspaceId });
    if (result.affected === 0) throw new NotFoundException('Regra não encontrada');
  }
}
