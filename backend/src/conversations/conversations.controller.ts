import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureGuard } from '../common/feature-access/feature.guard';
import { RequireFeature } from '../common/feature-access/require-feature.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('conversations')
@ApiBearerAuth('jwt')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private service: ConversationsService) {}

  @Get('inbox')
  @UseGuards(FeatureGuard)
  @RequireFeature('inbox')
  findInbox() {
    return this.service.findInbox();
  }

  @Get()
  findByLead(@Query('leadId') leadId: string) {
    return this.service.findByLead(leadId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/read')
  markAsRead(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.markAsRead(id);
  }
}
