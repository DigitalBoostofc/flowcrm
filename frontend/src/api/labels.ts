import { api } from './client';

export interface Label {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export async function listLabels(pipelineId?: string): Promise<Label[]> {
  const res = await api.get<Label[]>('/labels', { params: pipelineId ? { pipelineId } : {} });
  return res.data;
}

export async function createLabel(data: { name: string; color: string; pipelineId?: string }): Promise<Label> {
  const res = await api.post<Label>('/labels', data);
  return res.data;
}

export async function updateLabel(id: string, data: Partial<{ name: string; color: string }>): Promise<Label> {
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
