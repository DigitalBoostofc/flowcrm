import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, AgentConfig } from './entities/agent.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

const DEFAULT_CONFIG: AgentConfig = {
  enabledChannels: [],
  activationRules: { afterHours: false, weekends: false, unassigned: false, always: true },
  allowedTools: ['send_whatsapp', 'read_lead_context', 'add_lead_note', 'escalate_to_human'],
  escalationKeywords: ['cancelar', 'reclamar', 'falar com humano', 'reclamação'],
  maxMessagesPerConv: 5,
  cooldownSeconds: 30,
  defaultPipelineB2C: null,
  defaultPipelineB2B: null,
  initialDisclaimer: null,
  conversationFlow: [],
};

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent) private readonly repo: Repository<Agent>,
    private readonly tenant: TenantContext,
  ) {}

  async create(dto: CreateAgentDto): Promise<Agent> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const config: AgentConfig = {
      ...DEFAULT_CONFIG,
      enabledChannels: dto.enabledChannels ?? DEFAULT_CONFIG.enabledChannels,
      activationRules: { ...DEFAULT_CONFIG.activationRules, ...(dto.activationRules ?? {}) },
      allowedTools: dto.allowedTools ?? DEFAULT_CONFIG.allowedTools,
      escalationKeywords: dto.escalationKeywords ?? DEFAULT_CONFIG.escalationKeywords,
      maxMessagesPerConv: dto.maxMessagesPerConv ?? DEFAULT_CONFIG.maxMessagesPerConv,
      cooldownSeconds: dto.cooldownSeconds ?? DEFAULT_CONFIG.cooldownSeconds,
      defaultPipelineB2C: dto.defaultPipelineB2C ?? null,
      defaultPipelineB2B: dto.defaultPipelineB2B ?? null,
      initialDisclaimer: dto.initialDisclaimer ?? null,
      conversationFlow: dto.conversationFlow ?? [],
    };
    const agent = this.repo.create({
      workspaceId,
      name: dto.name,
      persona: dto.persona ?? 'proxima',
      model: dto.model ?? 'claude-haiku-4-5',
      systemPrompt: dto.systemPrompt ?? '',
      config,
      active: dto.active ?? false,
    });
    return this.repo.save(agent);
  }

  findAll(): Promise<Agent[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({ where: { workspaceId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Agent> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const agent = await this.repo.findOne({ where: { id, workspaceId } });
    if (!agent) throw new NotFoundException('Agente não encontrado');
    return agent;
  }

  async update(id: string, dto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.findOne(id);
    if (dto.name !== undefined) agent.name = dto.name;
    if (dto.persona !== undefined) agent.persona = dto.persona;
    if (dto.model !== undefined) agent.model = dto.model;
    if (dto.systemPrompt !== undefined) agent.systemPrompt = dto.systemPrompt;
    if (dto.active !== undefined) agent.active = dto.active;
    agent.config = {
      ...agent.config,
      ...(dto.enabledChannels !== undefined && { enabledChannels: dto.enabledChannels }),
      ...(dto.activationRules !== undefined && {
        activationRules: { ...agent.config.activationRules, ...dto.activationRules },
      }),
      ...(dto.allowedTools !== undefined && { allowedTools: dto.allowedTools }),
      ...(dto.escalationKeywords !== undefined && { escalationKeywords: dto.escalationKeywords }),
      ...(dto.maxMessagesPerConv !== undefined && { maxMessagesPerConv: dto.maxMessagesPerConv }),
      ...(dto.cooldownSeconds !== undefined && { cooldownSeconds: dto.cooldownSeconds }),
      ...(dto.defaultPipelineB2C !== undefined && { defaultPipelineB2C: dto.defaultPipelineB2C }),
      ...(dto.defaultPipelineB2B !== undefined && { defaultPipelineB2B: dto.defaultPipelineB2B }),
      ...(dto.initialDisclaimer !== undefined && { initialDisclaimer: dto.initialDisclaimer }),
      ...(dto.conversationFlow !== undefined && { conversationFlow: dto.conversationFlow }),
    };
    return this.repo.save(agent);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const result = await this.repo.softDelete({ id, workspaceId });
    if (!result.affected) throw new NotFoundException('Agente não encontrado');
  }
}
