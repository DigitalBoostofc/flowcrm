import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ContactActivitiesService } from './contact-activities.service';
import { CreateContactActivityDto } from './dto/create-contact-activity.dto';
import { UpdateContactActivityDto } from './dto/update-contact-activity.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard)
export class ContactActivitiesController {
  constructor(private service: ContactActivitiesService) {}

  /* ── Contact routes ── */

  @Get('contacts/:contactId/activities')
  findByContact(@Param('contactId') contactId: string) {
    return this.service.findByContact(contactId);
  }

  @Post('contacts/:contactId/activities')
  createForContact(
    @Param('contactId') contactId: string,
    @Body() dto: CreateContactActivityDto,
    @CurrentUser() user: User,
  ) {
    return this.service.create(dto, user.id, contactId, undefined);
  }

  /* ── Company routes ── */

  @Get('companies/:companyId/activities')
  findByCompany(@Param('companyId') companyId: string) {
    return this.service.findByCompany(companyId);
  }

  @Post('companies/:companyId/activities')
  createForCompany(
    @Param('companyId') companyId: string,
    @Body() dto: CreateContactActivityDto,
    @CurrentUser() user: User,
  ) {
    return this.service.create(dto, user.id, undefined, companyId);
  }

  /* ── Shared update/delete (by activity id) ── */

  @Patch('contact-activities/:id')
  update(@Param('id') id: string, @Body() dto: UpdateContactActivityDto) {
    return this.service.update(id, dto);
  }

  @Patch('contact-activities/:id/complete')
  complete(@Param('id') id: string) {
    return this.service.complete(id);
  }

  @Delete('contact-activities/:id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
