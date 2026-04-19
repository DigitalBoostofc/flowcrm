import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pipeline } from './entities/pipeline.entity';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';

@Injectable()
export class PipelinesService {
  constructor(
    @InjectRepository(Pipeline)
    private repo: Repository<Pipeline>,
  ) {}

  async create(dto: CreatePipelineDto): Promise<Pipeline> {
    if (dto.isDefault) {
      await this.repo.update({ isDefault: true }, { isDefault: false });
    }
    const pipeline = this.repo.create(dto);
    return this.repo.save(pipeline);
  }

  async update(id: string, dto: UpdatePipelineDto): Promise<Pipeline> {
    const pipeline = await this.findOne(id);
    if (dto.isDefault) {
      await this.repo.update({ isDefault: true }, { isDefault: false });
    }
    Object.assign(pipeline, dto);
    return this.repo.save(pipeline);
  }

  findAll(): Promise<Pipeline[]> {
    return this.repo.find({ relations: ['stages'], order: { createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<Pipeline> {
    const p = await this.repo.findOne({ where: { id }, relations: ['stages'] });
    if (!p) throw new NotFoundException('Pipeline não encontrado');
    return p;
  }

  findDefault(): Promise<Pipeline | null> {
    return this.repo.findOne({ where: { isDefault: true }, relations: ['stages'] });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
