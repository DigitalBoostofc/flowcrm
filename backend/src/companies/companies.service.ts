import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private repo: Repository<Company>,
  ) {}

  create(dto: CreateCompanyDto): Promise<Company> {
    const company = this.repo.create(dto);
    return this.repo.save(company);
  }

  findAll(search?: string): Promise<Company[]> {
    if (search) {
      const s = `%${search}%`;
      return this.repo.find({
        where: [
          { name: ILike(s) },
          { razaoSocial: ILike(s) },
          { cnpj: ILike(s) },
          { descricao: ILike(s) },
        ],
        relations: ['responsible'],
        order: { createdAt: 'DESC' },
      });
    }
    return this.repo.find({ relations: ['responsible'], order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.repo.findOne({ where: { id }, relations: ['responsible'] });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, dto);
    return this.repo.save(company);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Empresa não encontrada');
  }
}
