import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { StorageService } from '../storage/storage.service';
import { PaginatedResponse, PaginationDto, resolvePagination } from '../common/pagination/pagination.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private repo: Repository<Contact>,
    private readonly tenant: TenantContext,
    private readonly storage: StorageService,
  ) {}

  create(dto: CreateContactDto): Promise<Contact> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const contact = this.repo.create({ ...dto, workspaceId });
    return this.repo.save(contact);
  }

  async findAll(search?: string, pagination?: PaginationDto): Promise<PaginatedResponse<Contact>> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const { limit, offset } = resolvePagination(pagination);
    const where = search
      ? [
          { workspaceId, name: ILike(`%${search}%`) },
          { workspaceId, phone: ILike(`%${search}%`) },
        ]
      : { workspaceId };
    const [items, total] = await this.repo.findAndCount({
      where,
      relations: ['leads'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items, total, limit, offset };
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

  async findByPhone(phone: string): Promise<Contact | null> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.findOne({ where: { phone, workspaceId } });
  }

  async update(id: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findOne(id);
    Object.assign(contact, dto);
    return this.repo.save(contact);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const contact = await this.repo.findOne({ where: { id, workspaceId }, withDeleted: true });
    if (!contact) throw new NotFoundException('Contato não encontrado');

    // Delete leads (cascades: conversations → messages, conversation_labels, lead_activities, automation_executions)
    await this.repo.query(`DELETE FROM leads WHERE "contactId" = $1`, [id]);

    // Delete unlinked conversations matching contact's phones (cascades: messages, conversation_labels)
    const phones = [contact.phone, contact.whatsapp].filter(Boolean);
    if (phones.length) {
      await this.repo.query(
        `DELETE FROM conversations WHERE "workspaceId" = $1 AND "externalId" = ANY($2) AND "leadId" IS NULL`,
        [workspaceId, phones],
      );
    }

    // Hard delete contact (cascades: contact_activities)
    await this.repo.query(`DELETE FROM contacts WHERE id = $1 AND "workspaceId" = $2`, [id, workspaceId]);
  }

  async updateAvatar(id: string, file: { buffer: Buffer; mimetype: string; originalname: string; size: number }): Promise<Contact> {
    const contact = await this.findOne(id);
    const uploaded = await this.storage.uploadImage({ folder: 'avatars/contacts', file });
    const previousKey = contact.avatarKey;
    contact.avatarUrl = uploaded.url;
    contact.avatarKey = uploaded.key;
    const saved = await this.repo.save(contact);
    if (previousKey && previousKey !== uploaded.key) this.storage.delete(previousKey).catch(() => undefined);
    return saved;
  }

  async removeAvatar(id: string): Promise<Contact> {
    const contact = await this.findOne(id);
    const previousKey = contact.avatarKey;
    contact.avatarUrl = null;
    contact.avatarKey = null;
    const saved = await this.repo.save(contact);
    if (previousKey) this.storage.delete(previousKey).catch(() => undefined);
    return saved;
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
