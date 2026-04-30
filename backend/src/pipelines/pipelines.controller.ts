import { Controller, Get, Post, Patch, Body, Param, Delete, UseGuards, HttpCode } from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { StagesService } from '../stages/stages.service';
import { CreateStageDto } from '../stages/dto/create-stage.dto';
import { UpdateStageDto } from '../stages/dto/update-stage.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('pipelines')
@ApiBearerAuth('jwt')
@Controller('pipelines')
@UseGuards(JwtAuthGuard)
export class PipelinesController {
  constructor(
    private pipelinesService: PipelinesService,
    private stagesService: StagesService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  create(@Body() dto: CreatePipelineDto) {
    return this.pipelinesService.create(dto);
  }

  @Get()
  findAll() {
    return this.pipelinesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pipelinesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  update(@Param('id') id: string, @Body() dto: UpdatePipelineDto) {
    return this.pipelinesService.update(id, dto);
  }

  @Post(':id/stages')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  addStage(@Param('id') pipelineId: string, @Body() dto: CreateStageDto) {
    return this.stagesService.create(pipelineId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.pipelinesService.remove(id);
  }

  @Patch(':pipelineId/stages/:stageId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  updateStage(@Param('stageId') stageId: string, @Body() dto: UpdateStageDto) {
    return this.stagesService.update(stageId, dto);
  }

  @Delete(':pipelineId/stages/:stageId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @HttpCode(204)
  removeStage(@Param('stageId') stageId: string) {
    return this.stagesService.remove(stageId);
  }
}
