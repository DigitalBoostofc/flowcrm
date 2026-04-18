import { api } from './client';
import type { Conversation } from '@/types/api';

export async function listConversations(leadId: string): Promise<Conversation[]> {
  const res = await api.get<Conversation[]>('/conversations', { params: { leadId } });
  return res.data;
}
