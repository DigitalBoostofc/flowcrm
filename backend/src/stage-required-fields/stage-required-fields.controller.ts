import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { StageRequiredFieldsService } from './stage-required-fields.service';
import { CreateStageRequiredFieldDto } from './dto/create-stage-required-field.dto';
import { UpdateStageRequiredFieldDto } from './dto/update-stage-required-field.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('stage-required-fields')
@ApiBearerAuth('jwt')
@Controller('stages/:stageId/required-fields')
@UseGuards(JwtAuthGuard)
export class StageRequiredFieldsController {
  constructor(private service: StageRequiredFieldsService) {}

  @Get()
  findAll(@Param('stageId', new ParseUUIDPipe()) stageId: string) {
    return this.service.findByStage(stageId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  create(
    @Param('stageId', new ParseUUIDPipe()) stageId: string,
    @Body() dto: CreateStageRequiredFieldDto,
  ) {
    return this.service.create(stageId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  update(
    @Param('stageId', new ParseUUIDPipe()) stageId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStageRequiredFieldDto,
  ) {
    return this.service.update(stageId, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @HttpCode(204)
  remove(
    @Param('stageId', new ParseUUIDPipe()) stageId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.remove(stageId, id);
  }
}
