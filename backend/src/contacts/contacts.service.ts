import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private repo: Repository<Contact>,
    private readonly tenant: TenantContext,
  ) {}

  create(dto: CreateContactDto): Promise<Contact> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const contact = this.repo.create({ ...dto, workspaceId });
    return this.repo.save(contact);
  }

  findAll(search?: string): Promise<Contact[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    if (search) {
      return this.repo.find({
        where: [
          { workspaceId, name: ILike(`%${search}%`) },
          { workspaceId, phone: ILike(`%${search}%`) },
        ],
        relations: ['leads'],
        order: { createdAt: 'DESC' },
      });
    }
    return this.repo.find({
      where: { workspaceId },
      relations: ['leads'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Contact> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const contact = await this.repo.findOne({
      where: { id, workspaceId },
      relations: ['leads'],
    });
    if (!contact) throw new NotFoundException('Contato não encontrado');
    return contact;
  }

  async findOrCreateByPhone(phone: string, name: string): Promise<Contact> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const existing = await this.repo.findOne({ where: { phone, workspaceId } });
    if (existing) return existing;
    return this.create({ name, phone });
  }

  async update(id: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findOne(id);
    Object.assign(contact, dto);
    return this.repo.save(contact);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const result = await this.repo.delete({ id, workspaceId });
    if (result.affected === 0) throw new NotFoundException('Contato não encontrado');
  }

  async bulkCreate(rows: { name: string; phone?: string; email?: string; origin?: string }[]): Promise<{ created: number; skipped: number }> {
    const workspaceId = this.tenant.requireWorkspaceId();
    let created = 0;
    let skipped = 0;
    for (const row of rows) {
      if (!row.name?.trim()) { skipped++; continue; }
      if (row.phone?.trim()) {
        const existing = await this.repo.findOne({ where: { phone: row.phone.trim(), workspaceId } });
        if (existing) { skipped++; continue; }
      }
      await this.create({
        name: row.name.trim(),
        phone: row.phone?.trim() || undefined,
        email: row.email?.trim() || undefined,
        channelOrigin: row.origin?.trim() || undefined,
      });
      created++;
    }
    return { created, skipped };
  }
}
