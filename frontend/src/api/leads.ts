import { api } from './client';
import type { Lead, LeadStatus } from '@/types/api';

export async function listLeads(pipelineId: string, staleDays?: number): Promise<Lead[]> {
  const params: Record<string, string> = { pipelineId };
  if (staleDays) params.staleDays = String(staleDays);
  const res = await api.get<Lead[]>('/leads', { params });
  return res.data;
}

export async function listAllLeads(): Promise<Lead[]> {
  const res = await api.get<Lead[]>('/leads');
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
  contactId?: string;
  companyId?: string;
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
  data: {
    title?: string;
    value?: number | null;
    startDate?: string | null;
    conclusionDate?: string | null;
    assignedToId?: string | null;
    ranking?: number | null;
    notes?: string;
    customerOriginId?: string | null;
  },
): Promise<Lead> {
  const res = await api.patch<Lead>(`/leads/${id}`, data);
  return res.data;
}

export async function deleteLead(id: string): Promise<void> {
  await api.delete(`/leads/${id}`);
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  extra?: { lossReason?: string; freezeReason?: string; frozenReturnDate?: string },
): Promise<Lead> {
  const res = await api.patch<Lead>(`/leads/${id}/status`, { status, ...extra });
  return res.data;
}

export const archiveLead = (id: string): Promise<Lead> =>
  api.patch(`/leads/${id}/archive`).then((r) => r.data);

export const unarchiveLead = (id: string): Promise<Lead> =>
  api.patch(`/leads/${id}/unarchive`).then((r) => r.data);

export async function classifyLead(
  id: string,
  data: { name: string; phone?: string; email?: string },
): Promise<Lead> {
  const res = await api.post<Lead>(`/leads/${id}/classify`, data);
  return res.data;
}

export async function setLeadScore(id: string, score: number): Promise<Lead> {
  const res = await api.patch<Lead>(`/leads/${id}/score`, { score });
  return res.data;
}

export interface ScoringFactors {
  base: number;
  value: number;
  ranking: number;
  freshness: number;
  status: number;
}

export interface RecalculateScoreResponse {
  lead: Lead;
  result: { score: number; factors: ScoringFactors };
}

export async function recalculateLeadScore(id: string): Promise<RecalculateScoreResponse> {
  const res = await api.post<RecalculateScoreResponse>(`/leads/${id}/score/recalculate`);
  return res.data;
}
