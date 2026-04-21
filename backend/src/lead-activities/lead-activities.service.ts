import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadActivity } from './entities/lead-activity.entity';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto';
import { UpdateLeadActivityDto } from './dto/update-lead-activity.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class LeadActivitiesService {
  constructor(
    @InjectRepository(LeadActivity)
    private repo: Repository<LeadActivity>,
    private readonly tenant: TenantContext,
  ) {}

  create(leadId: string, dto: CreateLeadActivityDto): Promise<LeadActivity> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const activity = this.repo.create({ ...dto, leadId, workspaceId });
    return this.repo.save(activity);
  }

  findByLead(leadId: string): Promise<LeadActivity[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({
      where: { leadId, workspaceId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, dto: UpdateLeadActivityDto): Promise<LeadActivity> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const activity = await this.repo.findOne({ where: { id, workspaceId } });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    if (dto.body !== undefined) activity.body = dto.body;
    if (dto.scheduledAt !== undefined) activity.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    return this.repo.save(activity);
  }

  async complete(id: string): Promise<LeadActivity> {
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
