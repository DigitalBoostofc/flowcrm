import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { FeatureGuard } from '../common/feature-access/feature.guard';
import { RequireFeature } from '../common/feature-access/require-feature.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('automations')
@ApiBearerAuth('jwt')
@Controller('automations')
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Roles(UserRole.OWNER)
@RequireFeature('automations')
export class AutomationsController {
  constructor(private service: AutomationsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAutomationDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAutomationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }
}
