import { api } from './client';
import type { Conversation } from '@/types/api';

export interface InboxItem {
  id: string;
  leadId: string;
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

export async function listInbox(): Promise<InboxItem[]> {
  const res = await api.get<InboxItem[]>('/conversations/inbox');
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
