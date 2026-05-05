import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, IsHexColor, IsInt, Min } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InboxTagsService } from './inbox-tags.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateInboxTagDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

class UpdateInboxTagDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

@ApiTags('inbox-tags')
@ApiBearerAuth('jwt')
@Controller('inbox-tags')
@UseGuards(JwtAuthGuard)
export class InboxTagsController {
  constructor(private service: InboxTagsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateInboxTagDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateInboxTagDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }
}
