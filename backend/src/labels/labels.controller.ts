import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, UseGuards } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional, MaxLength, IsHexColor, IsInt } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

class CreateLabelDto {
  @IsString() @MaxLength(100) name: string;
  @IsString() @MaxLength(20) @IsHexColor() color: string;
}

class UpdateLabelDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(20) @IsHexColor() color?: string;
  @IsOptional() @IsInt() position?: number;
}

@ApiTags('labels')
@ApiBearerAuth('jwt')
@Controller('labels')
@UseGuards(JwtAuthGuard)
export class LabelsController {
  constructor(private service: LabelsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
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

  @Post('conversations/:convId/:labelId')
  @HttpCode(204)
  addToConversation(@Param('convId') convId: string, @Param('labelId') labelId: string) {
    return this.service.addToConversation(convId, labelId);
  }

  @Delete('conversations/:convId/:labelId')
  @HttpCode(204)
  removeFromConversation(@Param('convId') convId: string, @Param('labelId') labelId: string) {
    return this.service.removeFromConversation(convId, labelId);
  }
}
