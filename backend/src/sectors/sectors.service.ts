import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sector } from './entities/sector.entity';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class SectorsService {
  constructor(
    @InjectRepository(Sector)
    private repo: Repository<Sector>,
    private readonly tenant: TenantContext,
  ) {}

  findAll(): Promise<Sector[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({ where: { workspaceId }, order: { name: 'ASC' } });
  }

  async create(dto: CreateSectorDto): Promise<Sector> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const existing = await this.repo.findOne({ where: { workspaceId, name: dto.name } });
    if (existing) throw new ConflictException('Setor já existe');
    const entity = this.repo.create({ ...dto, workspaceId });
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateSectorDto): Promise<Sector> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const entity = await this.repo.findOne({ where: { id, workspaceId } });
    if (!entity) throw new NotFoundException('Setor não encontrado');
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Nome inválido');
      if (name !== entity.name) {
        const dup = await this.repo.findOne({ where: { workspaceId, name } });
        if (dup) throw new ConflictException('Setor já existe');
      }
      entity.name = name;
    }
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const result = await this.repo.delete({ id, workspaceId });
    if (result.affected === 0) throw new NotFoundException('Setor não encontrado');
  }
}
