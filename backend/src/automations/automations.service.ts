import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Automation } from './entities/automation.entity';
import { CreateAutomationDto } from './dto/create-automation.dto';

@Injectable()
export class AutomationsService {
  constructor(@InjectRepository(Automation) private repo: Repository<Automation>) {}

  async create(dto: CreateAutomationDto): Promise<Automation> {
    try {
      const a = this.repo.create(dto);
      return await this.repo.save(a);
    } catch (err) {
      if (err instanceof QueryFailedError && String(err.message).includes('duplicate')) {
        throw new ConflictException('Já existe uma automação para esta etapa');
      }
      throw err;
    }
  }

  findByStage(stageId: string): Promise<Automation | null> {
    return this.repo.findOne({ where: { stageId, active: true } });
  }

  findAll(): Promise<Automation[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Automation> {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Automação não encontrada');
    return a;
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
