import { api } from './client';

export interface Automation {
  id: string;
  stageId: string;
  delayMinutes: number;
  channelType: string;
  channelConfigId: string;
  templateId: string;
  active: boolean;
  createdAt: string;
}

export async function listAutomations(): Promise<Automation[]> {
  const res = await api.get<Automation[]>('/automations');
  return res.data;
}

export async function createAutomation(dto: {
  stageId: string;
  delayMinutes: number;
  channelType: string;
  channelConfigId: string;
  templateId: string;
  active?: boolean;
}): Promise<Automation> {
  const res = await api.post<Automation>('/automations', dto);
  return res.data;
}

export async function deleteAutomation(id: string): Promise<void> {
  await api.delete(`/automations/${id}`);
}
