import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerOrigin } from './entities/customer-origin.entity';
import { CreateCustomerOriginDto } from './dto/create-customer-origin.dto';
import { UpdateCustomerOriginDto } from './dto/update-customer-origin.dto';

@Injectable()
export class CustomerOriginsService {
  constructor(
    @InjectRepository(CustomerOrigin)
    private repo: Repository<CustomerOrigin>,
  ) {}

  findAll(): Promise<CustomerOrigin[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateCustomerOriginDto): Promise<CustomerOrigin> {
    const existing = await this.repo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Origem já existe');
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateCustomerOriginDto): Promise<CustomerOrigin> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Origem não encontrada');
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Nome inválido');
      if (name !== entity.name) {
        const dup = await this.repo.findOne({ where: { name } });
        if (dup) throw new ConflictException('Origem já existe');
      }
      entity.name = name;
    }
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Origem não encontrada');
  }
}
