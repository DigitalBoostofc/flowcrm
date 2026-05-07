import { api } from './client';

export interface Label {
  id: string;
  name: string;
  color: string;
  position: number;
  createdAt: string;
}

export async function listLabels(): Promise<Label[]> {
  const res = await api.get<Label[]>('/labels');
  return res.data;
}

export async function createLabel(data: { name: string; color: string }): Promise<Label> {
  const res = await api.post<Label>('/labels', data);
  return res.data;
}

export async function updateLabel(id: string, data: Partial<{ name: string; color: string; position: number }>): Promise<Label> {
  const res = await api.patch<Label>(`/labels/${id}`, data);
  return res.data;
}

export async function deleteLabel(id: string): Promise<void> {
  await api.delete(`/labels/${id}`);
}

export async function addLabelToLead(leadId: string, labelId: string): Promise<void> {
  await api.post(`/labels/leads/${leadId}/${labelId}`);
}

export async function removeLabelFromLead(leadId: string, labelId: string): Promise<void> {
  await api.delete(`/labels/leads/${leadId}/${labelId}`);
}

export async function addLabelToConversation(conversationId: string, labelId: string): Promise<void> {
  await api.post(`/labels/conversations/${conversationId}/${labelId}`);
}

export async function removeLabelFromConversation(conversationId: string, labelId: string): Promise<void> {
  await api.delete(`/labels/conversations/${conversationId}/${labelId}`);
}
