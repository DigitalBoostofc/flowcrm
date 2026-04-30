import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { LeadActivitiesService } from './lead-activities.service';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto';
import { UpdateLeadActivityDto } from './dto/update-lead-activity.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('lead-activities')
@ApiBearerAuth('jwt')
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadActivityDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.service.complete(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
