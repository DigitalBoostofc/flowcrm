import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { MoveLeadDto } from './dto/move-lead.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

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

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}
