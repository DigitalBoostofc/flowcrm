import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerCategory } from './entities/customer-category.entity';
import { CreateCustomerCategoryDto } from './dto/create-customer-category.dto';
import { UpdateCustomerCategoryDto } from './dto/update-customer-category.dto';

@Injectable()
export class CustomerCategoriesService {
  constructor(
    @InjectRepository(CustomerCategory)
    private repo: Repository<CustomerCategory>,
  ) {}

  findAll(): Promise<CustomerCategory[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateCustomerCategoryDto): Promise<CustomerCategory> {
    const existing = await this.repo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Categoria já existe');
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateCustomerCategoryDto): Promise<CustomerCategory> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Categoria não encontrada');
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Nome inválido');
      if (name !== entity.name) {
        const dup = await this.repo.findOne({ where: { name } });
        if (dup) throw new ConflictException('Categoria já existe');
      }
      entity.name = name;
    }
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Categoria não encontrada');
  }
}
