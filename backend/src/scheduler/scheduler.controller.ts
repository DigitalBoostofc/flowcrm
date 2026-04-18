import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ScheduleMessageDto } from './dto/schedule-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('scheduled-messages')
@UseGuards(JwtAuthGuard)
export class SchedulerController {
  constructor(private service: SchedulerService) {}

  @Post()
  schedule(@Body() dto: ScheduleMessageDto, @Request() req: { user: { id: string } }) {
    return this.service.schedule(dto, req.user.id);
  }

  @Get()
  findAll(@Query('conversationId') conversationId?: string) {
    if (conversationId) return this.service.findByConversation(conversationId);
    return this.service.findAll();
  }

  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
