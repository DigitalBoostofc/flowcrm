import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LossReason } from './entities/loss-reason.entity';
import { CreateLossReasonDto } from './dto/create-loss-reason.dto';
import { UpdateLossReasonDto } from './dto/update-loss-reason.dto';

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

  async update(id: string, dto: UpdateLossReasonDto): Promise<LossReason> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Motivo não encontrado');
    if (dto.label !== undefined) {
      const label = dto.label.trim();
      if (!label) throw new BadRequestException('Nome inválido');
      if (label !== entity.label) {
        const dup = await this.repo.findOne({ where: { label } });
        if (dup) throw new ConflictException('Motivo já existe');
      }
      entity.label = label;
    }
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Motivo não encontrado');
  }
}
