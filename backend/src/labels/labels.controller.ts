import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, UseGuards } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

class CreateLabelDto {
  @IsString() @MaxLength(100) name: string;
  @IsString() @MaxLength(20) color: string;
  @IsOptional() @IsUUID() pipelineId?: string;
}

class UpdateLabelDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
}

@ApiTags('labels')
@ApiBearerAuth('jwt')
@Controller('labels')
@UseGuards(JwtAuthGuard)
export class LabelsController {
  constructor(private service: LabelsService) {}

  @Get()
  findAll(@Query('pipelineId') pipelineId?: string) {
    return this.service.findAll(pipelineId);
  }

  @Post()
  create(@Body() dto: CreateLabelDto) { return this.service.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLabelDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post('leads/:leadId/:labelId')
  @HttpCode(204)
  addToLead(@Param('leadId') leadId: string, @Param('labelId') labelId: string) {
    return this.service.addToLead(leadId, labelId);
  }

  @Delete('leads/:leadId/:labelId')
  @HttpCode(204)
  removeFromLead(@Param('leadId') leadId: string, @Param('labelId') labelId: string) {
    return this.service.removeFromLead(leadId, labelId);
  }
}
