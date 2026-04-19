import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadActivity } from './entities/lead-activity.entity';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto';
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
}
