import { api } from './client';
import type { Lead } from '@/types/api';

export async function listLeads(pipelineId: string): Promise<Lead[]> {
  const res = await api.get<Lead[]>('/leads', { params: { pipelineId } });
  return res.data;
}

export async function moveLead(id: string, stageId: string): Promise<Lead> {
  const res = await api.patch<Lead>(`/leads/${id}/move`, { stageId });
  return res.data;
}

export async function getLead(id: string): Promise<Lead> {
  const res = await api.get<Lead>(`/leads/${id}`);
  return res.data;
}

export async function assignLead(id: string, userId: string): Promise<Lead> {
  const res = await api.patch<Lead>(`/leads/${id}/assign/${userId}`);
  return res.data;
}
