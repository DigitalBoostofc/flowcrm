import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { AiSettingsService } from './ai-settings.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { UpdateAiSettingsDto } from './dto/ai-settings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureGuard } from '../common/feature-access/feature.guard';
import { RequireFeature } from '../common/feature-access/require-feature.decorator';

@ApiTags('agents')
@ApiBearerAuth('jwt')
@Controller('agents')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('ai_agents')
export class AgentsController {
  constructor(
    private readonly agents: AgentsService,
    private readonly settings: AiSettingsService,
  ) {}

  // ─── AI Settings ─────────────────────────────────────────

  @Get('settings')
  getSettings() {
    return this.settings.getView();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateAiSettingsDto) {
    return this.settings.update(dto);
  }

  @Post('settings/validate')
  @HttpCode(200)
  validate() {
    return this.settings.validate();
  }

  // ─── Agents CRUD ─────────────────────────────────────────

  @Post()
  create(@Body() dto: CreateAgentDto) {
    return this.agents.create(dto);
  }

  @Get()
  list() {
    return this.agents.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.agents.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAgentDto) {
    return this.agents.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.agents.remove(id);
  }
}
