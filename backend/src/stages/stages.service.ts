import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stage } from './entities/stage.entity';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class StagesService {
  constructor(
    @InjectRepository(Stage)
    private repo: Repository<Stage>,
  ) {}

  async create(pipelineId: string, dto: CreateStageDto): Promise<Stage> {
    const count = await this.repo.count({ where: { pipelineId } });
    const stage = this.repo.create({ ...dto, pipelineId, position: dto.position ?? count });
    return this.repo.save(stage);
  }

  async update(id: string, dto: UpdateStageDto): Promise<Stage> {
    const stage = await this.findOne(id);
    Object.assign(stage, dto);
    return this.repo.save(stage);
  }

  findByPipeline(pipelineId: string): Promise<Stage[]> {
    return this.repo.find({ where: { pipelineId }, order: { position: 'ASC' } });
  }

  async findOne(id: string): Promise<Stage> {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Etapa não encontrada');
    return s;
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
