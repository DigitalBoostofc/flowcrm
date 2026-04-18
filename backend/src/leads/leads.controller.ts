import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { MoveLeadDto } from './dto/move-lead.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Get()
  findByPipeline(@Query('pipelineId') pipelineId: string) {
    return this.leadsService.findByPipeline(pipelineId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id/move')
  move(@Param('id') id: string, @Body() dto: MoveLeadDto) {
    return this.leadsService.move(id, dto.stageId);
  }

  @Patch(':id/assign/:userId')
  assign(@Param('id') id: string, @Param('userId') userId: string) {
    return this.leadsService.assign(id, userId);
  }
}
