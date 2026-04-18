import { api } from './client';
import type { LeadActivity, ActivityType } from '@/types/api';

export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const res = await api.get<LeadActivity[]>(`/leads/${leadId}/activities`);
  return res.data;
}

export async function createLeadActivity(
  leadId: string,
  data: { type: ActivityType; body: string },
): Promise<LeadActivity> {
  const res = await api.post<LeadActivity>(`/leads/${leadId}/activities`, data);
  return res.data;
}
