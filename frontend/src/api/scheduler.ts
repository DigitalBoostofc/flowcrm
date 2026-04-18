import { api } from './client';

export interface ScheduledMessage {
  id: string;
  conversationId: string;
  body: string;
  scheduledAt: string;
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  channelConfigId: string;
  createdById?: string | null;
  bullJobId?: string | null;
  createdAt: string;
}

export async function listScheduled(conversationId: string): Promise<ScheduledMessage[]> {
  const res = await api.get<ScheduledMessage[]>('/scheduled-messages', { params: { conversationId } });
  return res.data;
}

export async function scheduleMessage(dto: {
  conversationId: string;
  body: string;
  scheduledAt: string;
  channelConfigId: string;
}): Promise<ScheduledMessage> {
  const res = await api.post<ScheduledMessage>('/scheduled-messages', dto);
  return res.data;
}

export async function cancelScheduled(id: string): Promise<void> {
  await api.delete(`/scheduled-messages/${id}`);
}
