import { api } from './client';
import type { Conversation } from '@/types/api';

export interface InboxItem {
  id: string;
  leadId: string | null;
  channelType: string;
  externalId: string | null;
  contactId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactCategoria: string | null;
  contactAvatarUrl: string | null;
  lastMessageBody: string | null;
  lastMessageDirection: 'inbound' | 'outbound' | null;
  lastMessageSentAt: string | null;
  unread: boolean;
  updatedAt: string;
  pendingClassification: boolean;
}

export interface InboxPage {
  items: InboxItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listInbox(params: { page?: number; pageSize?: number } = {}): Promise<InboxPage> {
  const res = await api.get<InboxPage>('/conversations/inbox', { params });
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

export async function qualifyConversation(id: string, name: string): Promise<{ leadId: string }> {
  const res = await api.post<{ leadId: string }>(`/conversations/${id}/qualify`, { name });
  return res.data;
}
