import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactActivity } from './entities/contact-activity.entity';
import { CreateContactActivityDto } from './dto/create-contact-activity.dto';
import { UpdateContactActivityDto } from './dto/update-contact-activity.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class ContactActivitiesService {
  constructor(
    @InjectRepository(ContactActivity)
    private repo: Repository<ContactActivity>,
    private readonly tenant: TenantContext,
  ) {}

  create(
    dto: CreateContactActivityDto,
    createdById: string,
    contactId?: string,
    companyId?: string,
  ): Promise<ContactActivity> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const activity = this.repo.create({
      ...dto,
      workspaceId,
      createdById,
      contactId: contactId ?? null,
      companyId: companyId ?? null,
    });
    return this.repo.save(activity);
  }

  findByContact(contactId: string): Promise<ContactActivity[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({
      where: { contactId, workspaceId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  findByCompany(companyId: string): Promise<ContactActivity[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({
      where: { companyId, workspaceId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, dto: UpdateContactActivityDto): Promise<ContactActivity> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const activity = await this.repo.findOne({ where: { id, workspaceId } });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    if (dto.body !== undefined) activity.body = dto.body;
    if (dto.scheduledAt !== undefined) activity.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    return this.repo.save(activity);
  }

  async complete(id: string): Promise<ContactActivity> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const activity = await this.repo.findOne({ where: { id, workspaceId } });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    activity.completedAt = new Date();
    return this.repo.save(activity);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const result = await this.repo.delete({ id, workspaceId });
    if (result.affected === 0) throw new NotFoundException('Atividade não encontrada');
  }
}
