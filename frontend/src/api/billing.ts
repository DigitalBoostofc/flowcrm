import { api } from './client';
import type { SubscriptionStatus } from './workspace';

export interface BillingMe {
  enabled: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  planSlug: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function getMyBilling(): Promise<BillingMe> {
  const res = await api.get<BillingMe>('/billing/me');
  return res.data;
}

export async function createCheckoutSession(planSlug: string): Promise<{ url: string }> {
  const res = await api.post<{ url: string }>('/billing/checkout', { planSlug });
  return res.data;
}

export async function createPortalSession(): Promise<{ url: string }> {
  const res = await api.post<{ url: string }>('/billing/portal');
  return res.data;
}
