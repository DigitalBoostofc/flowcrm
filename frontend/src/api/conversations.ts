import { api } from './client';
import type { Conversation } from '@/types/api';

export interface InboxItem {
  id: string;
  leadId: string | null;
  channelType: string;
  externalId: string | null;
  contactId: string | null;
  contactName: string | null;
  fromName: string | null;
  contactPhone: string | null;
  contactCategoria: string | null;
  contactAvatarUrl: string | null;
  fromAvatarUrl: string | null;
  lastMessageBody: string | null;
  lastMessageDirection: 'inbound' | 'outbound' | null;
  lastMessageSentAt: string | null;
  unread: boolean;
  updatedAt: string;
  pinnedAt: string | null;
  pendingClassification: boolean;
  assignedToName: string | null;
  labels: { id: string; name: string; color: string }[];
}

export interface InboxPage {
  items: InboxItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listInbox(params: {
  page?: number;
  pageSize?: number;
  filter?: 'all' | 'archived';
  tagId?: string;
} = {}): Promise<InboxPage> {
  const res = await api.get<InboxPage>('/conversations/inbox', { params });
  return res.data;
}

export async function archiveConversation(id: string, archive: boolean): Promise<{ id: string; archivedAt: string | null }> {
  const res = await api.patch<{ id: string; archivedAt: string | null }>(`/conversations/${id}/archive`, { archive });
  return res.data;
}

export async function pinConversation(id: string, pinned: boolean): Promise<{ id: string; pinnedAt: string | null }> {
  const res = await api.patch<{ id: string; pinnedAt: string | null }>(`/conversations/${id}/pin`, { pinned });
  return res.data;
}

export async function listConversations(leadId: string): Promise<Conversation[]> {
  const res = await api.get<Conversation[]>('/conversations', { params: { leadId } });
  return res.data;
}

export async function markConversationRead(id: string): Promise<{ id: string; lastReadAt: string }> {
  const res = await api.post<{ id: string; lastReadAt: string }>(`/conversations/${id}/read`);
  return res.data;
}

export interface QualifyPayload {
  name: string;
  type?: 'person' | 'company';
  pipelineId?: string;
  stageId?: string;
  assignedToId: string;
}

export async function qualifyConversation(
  id: string,
  payload: QualifyPayload,
): Promise<{ leadId: string; pipelineId: string; stageId: string }> {
  const res = await api.post<{ leadId: string; pipelineId: string; stageId: string }>(
    `/conversations/${id}/qualify`,
    payload,
  );
  return res.data;
}
