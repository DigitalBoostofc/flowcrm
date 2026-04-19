import { api } from './client';
import type { Lead, LeadStatus } from '@/types/api';

export async function listLeads(pipelineId: string, staleDays?: number): Promise<Lead[]> {
  const params: Record<string, string> = { pipelineId };
  if (staleDays) params.staleDays = String(staleDays);
  const res = await api.get<Lead[]>('/leads', { params });
  return res.data;
}

export interface LeadItemInput {
  productName: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType: 'value' | 'percent';
}

export async function createLead(data: {
  contactId: string;
  pipelineId: string;
  stageId: string;
  title?: string;
  value?: number;
  notes?: string;
  assignedToId?: string;
  startDate?: string;
  conclusionDate?: string;
  privacy?: 'all' | 'restricted';
  additionalAccessUserIds?: string[];
  items?: LeadItemInput[];
}): Promise<Lead> {
  const res = await api.post<Lead>('/leads', data);
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

export const archiveLead = (id: string): Promise<Lead> =>
  api.patch(`/leads/${id}/archive`).then((r) => r.data);

export const unarchiveLead = (id: string): Promise<Lead> =>
  api.patch(`/leads/${id}/unarchive`).then((r) => r.data);
