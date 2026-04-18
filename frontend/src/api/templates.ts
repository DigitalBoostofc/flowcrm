import { api } from './client';

export interface MessageTemplate {
  id: string;
  name: string;
  body: string;
  createdById?: string | null;
  createdAt: string;
}

export async function listTemplates(): Promise<MessageTemplate[]> {
  const res = await api.get<MessageTemplate[]>('/templates');
  return res.data;
}

export async function createTemplate(dto: { name: string; body: string }): Promise<MessageTemplate> {
  const res = await api.post<MessageTemplate>('/templates', dto);
  return res.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/templates/${id}`);
}
