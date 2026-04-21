import { api } from './client';
import type { LeadActivity, ActivityType } from '@/types/api';

export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const res = await api.get<LeadActivity[]>(`/leads/${leadId}/activities`);
  return res.data;
}

export async function createLeadActivity(
  leadId: string,
  data: { type: ActivityType; body: string; scheduledAt?: string },
): Promise<LeadActivity> {
  const res = await api.post<LeadActivity>(`/leads/${leadId}/activities`, data);
  return res.data;
}

export async function updateLeadActivity(
  leadId: string,
  id: string,
  data: { body?: string; scheduledAt?: string | null },
): Promise<LeadActivity> {
  const res = await api.patch<LeadActivity>(`/leads/${leadId}/activities/${id}`, data);
  return res.data;
}

export async function completeLeadActivity(leadId: string, id: string): Promise<LeadActivity> {
  const res = await api.patch<LeadActivity>(`/leads/${leadId}/activities/${id}/complete`);
  return res.data;
}

export async function deleteLeadActivity(leadId: string, id: string): Promise<void> {
  await api.delete(`/leads/${leadId}/activities/${id}`);
}
