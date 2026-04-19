import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerOrigin } from './entities/customer-origin.entity';
import { CreateCustomerOriginDto } from './dto/create-customer-origin.dto';
import { UpdateCustomerOriginDto } from './dto/update-customer-origin.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class CustomerOriginsService {
  constructor(
    @InjectRepository(CustomerOrigin)
    private repo: Repository<CustomerOrigin>,
    private readonly tenant: TenantContext,
  ) {}

  findAll(): Promise<CustomerOrigin[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({ where: { workspaceId }, order: { name: 'ASC' } });
  }

  async create(dto: CreateCustomerOriginDto): Promise<CustomerOrigin> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const existing = await this.repo.findOne({ where: { workspaceId, name: dto.name } });
    if (existing) throw new ConflictException('Origem já existe');
    const entity = this.repo.create({ ...dto, workspaceId });
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateCustomerOriginDto): Promise<CustomerOrigin> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const entity = await this.repo.findOne({ where: { id, workspaceId } });
    if (!entity) throw new NotFoundException('Origem não encontrada');
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Nome inválido');
      if (name !== entity.name) {
        const dup = await this.repo.findOne({ where: { workspaceId, name } });
        if (dup) throw new ConflictException('Origem já existe');
      }
      entity.name = name;
    }
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const result = await this.repo.delete({ id, workspaceId });
    if (result.affected === 0) throw new NotFoundException('Origem não encontrada');
  }
}
