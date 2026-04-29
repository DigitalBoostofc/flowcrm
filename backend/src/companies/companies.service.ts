import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { StorageService } from '../storage/storage.service';
import { PaginatedResponse, PaginationDto, resolvePagination } from '../common/pagination/pagination.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private repo: Repository<Company>,
    private readonly tenant: TenantContext,
    private readonly storage: StorageService,
  ) {}

  create(dto: CreateCompanyDto): Promise<Company> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const company = this.repo.create({ ...dto, workspaceId });
    return this.repo.save(company);
  }

  async findAll(search?: string, pagination?: PaginationDto): Promise<PaginatedResponse<Company>> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const { limit, offset } = resolvePagination(pagination);
    let where: any = { workspaceId };
    if (search) {
      const s = `%${search}%`;
      where = [
        { workspaceId, name: ILike(s) },
        { workspaceId, razaoSocial: ILike(s) },
        { workspaceId, cnpj: ILike(s) },
        { workspaceId, descricao: ILike(s) },
      ];
    }
    const [items, total] = await this.repo.findAndCount({
      where,
      relations: ['responsible'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items, total, limit, offset };
  }

  async findOne(id: string): Promise<Company> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const company = await this.repo.findOne({
      where: { id, workspaceId },
      relations: ['responsible'],
    });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, dto);
    return this.repo.save(company);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const result = await this.repo.softDelete({ id, workspaceId });
    if (result.affected === 0) throw new NotFoundException('Empresa não encontrada');
  }

  async updateAvatar(id: string, file: { buffer: Buffer; mimetype: string; originalname: string; size: number }): Promise<Company> {
    const company = await this.findOne(id);
    const uploaded = await this.storage.uploadImage({ folder: 'avatars/companies', file });
    const previousKey = company.avatarKey;
    company.avatarUrl = uploaded.url;
    company.avatarKey = uploaded.key;
    const saved = await this.repo.save(company);
    if (previousKey && previousKey !== uploaded.key) this.storage.delete(previousKey).catch(() => undefined);
    return saved;
  }

  async removeAvatar(id: string): Promise<Company> {
    const company = await this.findOne(id);
    const previousKey = company.avatarKey;
    company.avatarUrl = null;
    company.avatarKey = null;
    const saved = await this.repo.save(company);
    if (previousKey) this.storage.delete(previousKey).catch(() => undefined);
    return saved;
  }
}
