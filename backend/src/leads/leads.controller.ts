import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { MoveLeadDto } from './dto/move-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Post()
  create(@Body() dto: CreateLeadDto, @Req() req: any) {
    return this.leadsService.create(dto, req.user?.sub);
  }

  @Get()
  list(
    @Query('pipelineId') pipelineId?: string,
    @Query('staleDays') staleDays?: string,
  ) {
    if (!pipelineId) return this.leadsService.findAll();
    return this.leadsService.findByPipeline(pipelineId, staleDays ? parseInt(staleDays) : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leadsService.updateStatus(id, dto);
  }

  @Patch(':id/move')
  move(@Param('id') id: string, @Body() dto: MoveLeadDto) {
    return this.leadsService.move(id, dto.stageId);
  }

  @Patch(':id/assign/:userId')
  assign(@Param('id') id: string, @Param('userId') userId: string) {
    return this.leadsService.assign(id, userId);
  }

  @Patch(':id/archive')
  archive(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.leadsService.archive(id);
  }

  @Patch(':id/unarchive')
  unarchive(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.leadsService.unarchive(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}
