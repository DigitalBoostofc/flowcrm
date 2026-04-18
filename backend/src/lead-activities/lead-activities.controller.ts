import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { LeadActivitiesService } from './lead-activities.service';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('leads/:leadId/activities')
@UseGuards(JwtAuthGuard)
export class LeadActivitiesController {
  constructor(private service: LeadActivitiesService) {}

  @Get()
  findAll(@Param('leadId') leadId: string) {
    return this.service.findByLead(leadId);
  }

  @Post()
  create(
    @Param('leadId') leadId: string,
    @Body() dto: CreateLeadActivityDto,
    @CurrentUser() user: User,
  ) {
    return this.service.create(leadId, { ...dto, createdById: user.id });
  }
}
