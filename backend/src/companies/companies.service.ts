import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private repo: Repository<Company>,
    private readonly tenant: TenantContext,
  ) {}

  create(dto: CreateCompanyDto): Promise<Company> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const company = this.repo.create({ ...dto, workspaceId });
    return this.repo.save(company);
  }

  findAll(search?: string): Promise<Company[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    if (search) {
      const s = `%${search}%`;
      return this.repo.find({
        where: [
          { workspaceId, name: ILike(s) },
          { workspaceId, razaoSocial: ILike(s) },
          { workspaceId, cnpj: ILike(s) },
          { workspaceId, descricao: ILike(s) },
        ],
        relations: ['responsible'],
        order: { createdAt: 'DESC' },
      });
    }
    return this.repo.find({
      where: { workspaceId },
      relations: ['responsible'],
      order: { createdAt: 'DESC' },
    });
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
    const result = await this.repo.delete({ id, workspaceId });
    if (result.affected === 0) throw new NotFoundException('Empresa não encontrada');
  }
}
