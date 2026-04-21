import { api } from './client';
import type { User } from '@/types/api';

export interface WorkspaceSummary {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'canceled';
  planSlug: string | null;
  trialStartedAt: string;
  trialEndsAt: string;
  usersCount: number;
  leadsCount: number;
  messagesLast30d: number;
  createdAt: string;
}

export interface WorkspaceDetail {
  workspace: any;
  users: User[];
  channels: PlatformChannel[];
}

export interface PlatformChannel {
  id: string;
  workspaceId: string;
  workspaceName: string | null;
  name: string;
  type: string;
  status: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignupEntry {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  workspaceName: string | null;
  attempts: number;
  verified: boolean;
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
}

export interface SignupFunnel {
  started: number;
  verified: number;
  workspacesCreated: number;
  convertedToPaid: number;
}

export interface PlatformMetrics {
  totalWorkspaces: number;
  byStatus: { trial: number; active: number; expired: number; canceled: number };
  trialExpiringIn7d: number;
  totalUsers: number;
  totalLeads: number;
  totalMessagesLast30d: number;
}

export type BroadcastSeverity = 'info' | 'warning' | 'critical';

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  severity: BroadcastSeverity;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveBroadcast {
  id: string;
  title: string;
  body: string;
  severity: BroadcastSeverity;
}

export interface FeatureFlag {
  id: string;
  key: string;
  workspaceId: string | null;
  enabled: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorEmail: string;
  actorUserId: string | null;
  action: string;
  targetWorkspaceId: string | null;
  targetUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export const listWorkspaces = (search?: string) =>
  api.get<WorkspaceSummary[]>('/platform/workspaces', { params: search ? { search } : {} }).then((r) => r.data);

export const getWorkspaceDetail = (id: string) =>
  api.get<WorkspaceDetail>(`/platform/workspaces/${id}`).then((r) => r.data);

export const updateWorkspace = (id: string, patch: Partial<{ name: string; subscriptionStatus: string; trialEndsAt: string; planSlug: string | null }>) =>
  api.patch(`/platform/workspaces/${id}`, patch).then((r) => r.data);

export const impersonateWorkspace = (id: string) =>
  api.post<{ accessToken: string; user: User }>(`/platform/workspaces/${id}/impersonate`).then((r) => r.data);

export const listPlatformChannels = () =>
  api.get<PlatformChannel[]>('/platform/channels').then((r) => r.data);

export const listSignups = (days = 30) =>
  api.get<SignupEntry[]>('/platform/signups', { params: { days } }).then((r) => r.data);

export const getSignupFunnel = (days = 30) =>
  api.get<SignupFunnel>('/platform/signups/funnel', { params: { days } }).then((r) => r.data);

export const getPlatformMetrics = () =>
  api.get<PlatformMetrics>('/platform/metrics').then((r) => r.data);

export const listBroadcasts = () =>
  api.get<Broadcast[]>('/platform/broadcasts').then((r) => r.data);

export const createBroadcast = (dto: Partial<Broadcast>) =>
  api.post<Broadcast>('/platform/broadcasts', dto).then((r) => r.data);

export const updateBroadcast = (id: string, dto: Partial<Broadcast>) =>
  api.patch<Broadcast>(`/platform/broadcasts/${id}`, dto).then((r) => r.data);

export const deleteBroadcast = (id: string) =>
  api.delete(`/platform/broadcasts/${id}`).then((r) => r.data);

export const listActiveBroadcasts = () =>
  api.get<ActiveBroadcast[]>('/broadcasts/active').then((r) => r.data);

export const listFlags = () =>
  api.get<FeatureFlag[]>('/platform/flags').then((r) => r.data);

export const upsertFlag = (dto: { key: string; workspaceId?: string | null; enabled: boolean; metadata?: Record<string, unknown> }) =>
  api.post<FeatureFlag>('/platform/flags', dto).then((r) => r.data);

export const deleteFlag = (id: string) =>
  api.delete(`/platform/flags/${id}`).then((r) => r.data);

export const listAudit = (limit = 100, offset = 0) =>
  api.get<AuditLog[]>('/platform/audit', { params: { limit, offset } }).then((r) => r.data);
