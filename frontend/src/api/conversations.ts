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
  lastMessageBody: string | null;
  lastMessageDirection: 'inbound' | 'outbound' | null;
  lastMessageSentAt: string | null;
  unread: boolean;
  updatedAt: string;
}

export async function listInbox(): Promise<InboxItem[]> {
  const res = await api.get<InboxItem[]>('/conversations/inbox');
  return res.data;
}

export async function listConversations(leadId: string): Promise<Conversation[]> {
  const res = await api.get<Conversation[]>('/conversations', { params: { leadId } });
  return res.data;
}
