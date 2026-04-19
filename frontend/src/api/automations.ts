import { api } from './client';

export type AutomationTriggerType = 'pipeline' | 'stage';
export type AutomationStepType = 'wait' | 'filter' | 'send_whatsapp';

export interface WaitStepConfig {
  amount: number;
  unit: 'minutes' | 'hours' | 'days';
}

export interface FilterCondition {
  target: 'lead' | 'contact' | 'company';
  field: string;
  operator:
    | 'eq' | 'neq' | 'contains' | 'not_contains'
    | 'gt' | 'lt' | 'gte' | 'lte' | 'empty' | 'not_empty';
  value?: string | number;
}

export interface FilterStepConfig {
  logic: 'and' | 'or';
  conditions: FilterCondition[];
}

export interface SendWhatsappStepConfig {
  channelId: string;
  templateId: string;
}

export type AutomationStepConfig =
  | WaitStepConfig
  | FilterStepConfig
  | SendWhatsappStepConfig
  | Record<string, unknown>;

export interface AutomationStep {
  id?: string;
  position: number;
  type: AutomationStepType;
  config: AutomationStepConfig;
}

export interface Automation {
  id: string;
  name: string;
  triggerType: AutomationTriggerType;
  pipelineId: string | null;
  stageId: string | null;
  active: boolean;
  steps: AutomationStep[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationDto {
  name: string;
  triggerType: AutomationTriggerType;
  pipelineId?: string | null;
  stageId?: string | null;
  active?: boolean;
  steps: { position: number; type: AutomationStepType; config: AutomationStepConfig }[];
}

export type UpdateAutomationDto = Partial<CreateAutomationDto>;

export const listAutomations = (): Promise<Automation[]> =>
  api.get('/automations').then((r) => r.data);

export const getAutomation = (id: string): Promise<Automation> =>
  api.get(`/automations/${id}`).then((r) => r.data);

export const createAutomation = (dto: CreateAutomationDto): Promise<Automation> =>
  api.post('/automations', dto).then((r) => r.data);

export const updateAutomation = (id: string, dto: UpdateAutomationDto): Promise<Automation> =>
  api.patch(`/automations/${id}`, dto).then((r) => r.data);

export const deleteAutomation = (id: string): Promise<void> =>
  api.delete(`/automations/${id}`).then((r) => r.data);
