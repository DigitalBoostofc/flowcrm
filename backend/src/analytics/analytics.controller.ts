import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('summary')
  getSummary(@Query('pipelineId') pipelineId?: string) {
    return this.service.getSummary(pipelineId);
  }
}
