import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LossReason } from './entities/loss-reason.entity';
import { CreateLossReasonDto } from './dto/create-loss-reason.dto';

@Injectable()
export class LossReasonsService {
  constructor(
    @InjectRepository(LossReason)
    private repo: Repository<LossReason>,
  ) {}

  findAll(): Promise<LossReason[]> {
    return this.repo.find({ order: { label: 'ASC' } });
  }

  async create(dto: CreateLossReasonDto): Promise<LossReason> {
    const existing = await this.repo.findOne({ where: { label: dto.label } });
    if (existing) throw new ConflictException('Motivo já existe');
    const reason = this.repo.create(dto);
    return this.repo.save(reason);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Motivo não encontrado');
  }
}
