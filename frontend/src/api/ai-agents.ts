import { api } from './client';

export type AgentPersona = 'formal' | 'proxima' | 'divertida';

export interface ActivationRules {
  afterHours?: boolean;
  weekends?: boolean;
  unassigned?: boolean;
  always?: boolean;
}

export interface ConversationFlowStep {
  id: string;
  order: number;
  name: string;
  goal: string;
  completionCriteria: string;
  pipelineStageId?: string | null;
}

export interface AgentConfig {
  enabledChannels: string[];
  activationRules: ActivationRules;
  allowedTools: string[];
  escalationKeywords: string[];
  maxMessagesPerConv: number;
  cooldownSeconds: number;
  defaultPipelineB2C?: string | null;
  defaultPipelineB2B?: string | null;
  initialDisclaimer?: string | null;
  conversationFlow?: ConversationFlowStep[];
}

export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  persona: AgentPersona;
  model: string;
  systemPrompt: string;
  config: AgentConfig;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiSettings {
  id: string;
  workspaceId: string;
  provider: string;
  keySource: 'platform' | 'byo';
  apiKeyMasked: string | null;
  defaultModel: string;
  monthlyTokenBudget: number | null;
  tokensUsedThisMonth: number;
  lastValidatedAt: string | null;
  enabled: boolean;
}

export interface UpdateAiSettingsInput {
  keySource?: 'platform' | 'byo';
  apiKey?: string;
  defaultModel?: string;
  monthlyTokenBudget?: number | null;
  enabled?: boolean;
}

export interface CreateAgentInput {
  name: string;
  persona?: AgentPersona;
  model?: string;
  systemPrompt?: string;
  enabledChannels?: string[];
  activationRules?: ActivationRules;
  allowedTools?: string[];
  escalationKeywords?: string[];
  maxMessagesPerConv?: number;
  cooldownSeconds?: number;
  defaultPipelineB2C?: string | null;
  defaultPipelineB2B?: string | null;
  initialDisclaimer?: string | null;
  conversationFlow?: ConversationFlowStep[];
  active?: boolean;
}

export type UpdateAgentInput = Partial<CreateAgentInput>;

export const aiAgents = {
  getSettings: async (): Promise<AiSettings> => (await api.get<AiSettings>('/agents/settings')).data,
  updateSettings: async (dto: UpdateAiSettingsInput): Promise<AiSettings> =>
    (await api.patch<AiSettings>('/agents/settings', dto)).data,
  validate: async (): Promise<{ ok: boolean; error?: string }> =>
    (await api.post<{ ok: boolean; error?: string }>('/agents/settings/validate')).data,

  list: async (): Promise<Agent[]> => (await api.get<Agent[]>('/agents')).data,
  get: async (id: string): Promise<Agent> => (await api.get<Agent>(`/agents/${id}`)).data,
  create: async (dto: CreateAgentInput): Promise<Agent> =>
    (await api.post<Agent>('/agents', dto)).data,
  update: async (id: string, dto: UpdateAgentInput): Promise<Agent> =>
    (await api.patch<Agent>(`/agents/${id}`, dto)).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/agents/${id}`);
  },
};
