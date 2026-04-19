import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Automation } from './entities/automation.entity';
import { AutomationStep } from './entities/automation-step.entity';
import { CreateAutomationDto, AutomationStepDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';

@Injectable()
export class AutomationsService {
  constructor(
    @InjectRepository(Automation) private autoRepo: Repository<Automation>,
    @InjectRepository(AutomationStep) private stepRepo: Repository<AutomationStep>,
    private dataSource: DataSource,
  ) {}

  private validateTrigger(dto: { triggerType: string; pipelineId?: string | null; stageId?: string | null }) {
    if (dto.triggerType === 'pipeline' && !dto.pipelineId) {
      throw new BadRequestException('pipelineId é obrigatório para trigger de funil');
    }
    if (dto.triggerType === 'stage' && !dto.stageId) {
      throw new BadRequestException('stageId é obrigatório para trigger de etapa');
    }
  }

  async create(dto: CreateAutomationDto): Promise<Automation> {
    this.validateTrigger(dto);

    return this.dataSource.transaction(async (manager) => {
      const auto = manager.create(Automation, {
        name: dto.name,
        triggerType: dto.triggerType,
        pipelineId: dto.triggerType === 'pipeline' ? dto.pipelineId ?? null : null,
        stageId: dto.triggerType === 'stage' ? dto.stageId ?? null : null,
        active: dto.active ?? true,
      });
      const saved = await manager.save(auto);

      if (dto.steps?.length) {
        const steps = dto.steps.map((s) =>
          manager.create(AutomationStep, {
            automationId: saved.id,
            position: s.position,
            type: s.type,
            config: s.config,
          }),
        );
        await manager.save(steps);
      }

      return manager.findOneOrFail(Automation, {
        where: { id: saved.id },
        relations: ['steps'],
      });
    });
  }

  async update(id: string, dto: UpdateAutomationDto): Promise<Automation> {
    const current = await this.findOne(id);

    const next = {
      name: dto.name ?? current.name,
      triggerType: dto.triggerType ?? current.triggerType,
      pipelineId: dto.pipelineId !== undefined ? dto.pipelineId : current.pipelineId,
      stageId: dto.stageId !== undefined ? dto.stageId : current.stageId,
    };
    this.validateTrigger(next);

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Automation, id, {
        name: next.name,
        triggerType: next.triggerType,
        pipelineId: next.triggerType === 'pipeline' ? next.pipelineId : null,
        stageId: next.triggerType === 'stage' ? next.stageId : null,
        active: dto.active ?? current.active,
      });

      if (dto.steps) {
        await manager.delete(AutomationStep, { automationId: id });
        if (dto.steps.length) {
          const steps = dto.steps.map((s: AutomationStepDto) =>
            manager.create(AutomationStep, {
              automationId: id,
              position: s.position,
              type: s.type,
              config: s.config,
            }),
          );
          await manager.save(steps);
        }
      }

      return manager.findOneOrFail(Automation, {
        where: { id },
        relations: ['steps'],
      });
    });
  }

  findAll(): Promise<Automation[]> {
    return this.autoRepo.find({
      relations: ['steps', 'pipeline', 'stage'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Automation> {
    const a = await this.autoRepo.findOne({
      where: { id },
      relations: ['steps', 'pipeline', 'stage'],
    });
    if (!a) throw new NotFoundException('Automação não encontrada');
    return a;
  }

  async findActiveByStage(stageId: string): Promise<Automation[]> {
    return this.autoRepo.find({
      where: { stageId, triggerType: 'stage', active: true },
      relations: ['steps'],
    });
  }

  async findActiveByPipeline(pipelineId: string): Promise<Automation[]> {
    return this.autoRepo.find({
      where: { pipelineId, triggerType: 'pipeline', active: true },
      relations: ['steps'],
    });
  }

  async remove(id: string): Promise<void> {
    const r = await this.autoRepo.delete(id);
    if (r.affected === 0) throw new NotFoundException('Automação não encontrada');
  }
}
