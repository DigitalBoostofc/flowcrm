import { api } from './client';
import type { Lead, LeadStatus } from '@/types/api';

export async function listLeads(pipelineId: string, staleDays?: number): Promise<Lead[]> {
  const params: Record<string, string> = { pipelineId };
  if (staleDays) params.staleDays = String(staleDays);
  const res = await api.get<Lead[]>('/leads', { params });
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

export async function updateLead(
  id: string,
  data: { title?: string; value?: number; startDate?: string; conclusionDate?: string; assignedToId?: string },
): Promise<Lead> {
  const res = await api.patch<Lead>(`/leads/${id}`, data);
  return res.data;
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  lossReason?: string,
): Promise<Lead> {
  const res = await api.patch<Lead>(`/leads/${id}/status`, { status, lossReason });
  return res.data;
}
