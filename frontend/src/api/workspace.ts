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
  slug: string;
  name: string;
  description: string;
  priceMonthlyCents: number;
  features: string[];
  highlight: boolean;
  active: boolean;
  sortOrder: number;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
}

export interface FeatureDef {
  key: string;
  label: string;
  description: string;
}

export interface MeFeatures {
  planSlug: string | null;
  subscriptionStatus: SubscriptionStatus;
  features: string[];
  allUnlocked: boolean;
}

export async function listPlans(): Promise<Plan[]> {
  const res = await api.get<Plan[]>('/subscriptions/plans');
  return res.data;
}

export async function getMyFeatures(): Promise<MeFeatures> {
  const res = await api.get<MeFeatures>('/subscriptions/me/features');
  return res.data;
}

export async function getFeatureCatalog(): Promise<FeatureDef[]> {
  const res = await api.get<FeatureDef[]>('/subscriptions/features/catalog');
  return res.data;
}

export async function subscribePlan(planSlug: string): Promise<WorkspaceMe> {
  const res = await api.post<WorkspaceMe>('/subscriptions/subscribe', { planId: planSlug });
  return res.data;
}

export async function cancelSubscription(): Promise<WorkspaceMe> {
  const res = await api.post<WorkspaceMe>('/subscriptions/cancel');
  return res.data;
}

// ── Platform Admin ────────────────────────────────

export interface CreatePlanInput {
  slug: string;
  name: string;
  description?: string;
  priceMonthlyCents: number;
  features: string[];
  highlight?: boolean;
  active?: boolean;
  sortOrder?: number;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
}

export type UpdatePlanInput = Partial<CreatePlanInput>;

export async function adminListPlans(): Promise<Plan[]> {
  const res = await api.get<Plan[]>('/platform/plans');
  return res.data;
}

export async function adminGetFeatureCatalog(): Promise<FeatureDef[]> {
  const res = await api.get<FeatureDef[]>('/platform/plans/catalog');
  return res.data;
}

export async function adminCreatePlan(input: CreatePlanInput): Promise<Plan> {
  const res = await api.post<Plan>('/platform/plans', input);
  return res.data;
}

export async function adminUpdatePlan(id: string, input: UpdatePlanInput): Promise<Plan> {
  const res = await api.patch<Plan>(`/platform/plans/${id}`, input);
  return res.data;
}

export async function adminDeletePlan(id: string): Promise<void> {
  await api.delete(`/platform/plans/${id}`);
}
