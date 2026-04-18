import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadActivity } from './entities/lead-activity.entity';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto';

@Injectable()
export class LeadActivitiesService {
  constructor(
    @InjectRepository(LeadActivity)
    private repo: Repository<LeadActivity>,
  ) {}

  create(leadId: string, dto: CreateLeadActivityDto): Promise<LeadActivity> {
    const activity = this.repo.create({ ...dto, leadId });
    return this.repo.save(activity);
  }

  findByLead(leadId: string): Promise<LeadActivity[]> {
    return this.repo.find({
      where: { leadId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }
}
