import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { PaginatedResponse, PaginationDto, resolvePagination } from '../common/pagination/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private repo: Repository<Product>,
    private readonly tenant: TenantContext,
  ) {}

  async findAll(onlyActive = false, pagination?: PaginationDto): Promise<PaginatedResponse<Product>> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const { limit, offset } = resolvePagination(pagination);
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p."workspaceId" = :workspaceId', { workspaceId })
      .andWhere('p."deletedAt" IS NULL');

    if (onlyActive) {
      qb.andWhere('p.active = true');
    }

    qb.orderBy('p.name', 'ASC').take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit, offset };
  }

  async findByNames(names: string[]): Promise<Product[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    if (!names.length) return [];
    return this.repo.find({ where: { workspaceId, name: In(names) } });
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Nome inválido');
    const dup = await this.repo.findOne({ where: { workspaceId, name } });
    if (dup) throw new ConflictException('Produto/serviço com este nome já existe');
    const entity = this.repo.create({
      workspaceId,
      name,
      type: dto.type ?? 'produto',
      price: dto.price != null ? String(dto.price) : null,
      active: dto.active ?? true,
    });
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const entity = await this.repo.findOne({ where: { id, workspaceId } });
    if (!entity) throw new NotFoundException('Produto/serviço não encontrado');

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Nome inválido');
      if (name !== entity.name) {
        const dup = await this.repo.findOne({ where: { workspaceId, name } });
        if (dup) throw new ConflictException('Produto/serviço com este nome já existe');
      }
      entity.name = name;
    }
    if (dto.type !== undefined) entity.type = dto.type;
    if (dto.price !== undefined) entity.price = dto.price != null ? String(dto.price) : null;
    if (dto.active !== undefined) entity.active = dto.active;

    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const result = await this.repo.softDelete({ id, workspaceId });
    if (result.affected === 0) throw new NotFoundException('Produto/serviço não encontrado');
  }
}
