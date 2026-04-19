import { api } from './client';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled';

export interface WorkspaceMe {
  id: string;
  name: string;
  ownerUserId: string | null;
  trialStartedAt: string;
  trialEndsAt: string;
  subscriptionStatus: SubscriptionStatus;
  trialDaysLeft: number;
  isBlocked: boolean;
  isPlatformAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getMyWorkspace(): Promise<WorkspaceMe> {
  const res = await api.get<WorkspaceMe>('/workspace/me');
  return res.data;
}

export interface Plan {
  id: string;
  name: string;
  priceMonthlyCents: number;
  features: string[];
  highlight?: boolean;
}

export async function listPlans(): Promise<Plan[]> {
  const res = await api.get<Plan[]>('/subscriptions/plans');
  return res.data;
}

export async function subscribePlan(planId: string): Promise<WorkspaceMe> {
  const res = await api.post<WorkspaceMe>('/subscriptions/subscribe', { planId });
  return res.data;
}

export async function cancelSubscription(): Promise<WorkspaceMe> {
  const res = await api.post<WorkspaceMe>('/subscriptions/cancel');
  return res.data;
}
