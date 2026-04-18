import { api } from './client';
import type { Message } from '@/types/api';

export async function listMessages(conversationId: string): Promise<Message[]> {
  const res = await api.get<Message[]>('/messages', { params: { conversationId } });
  return res.data;
}

export async function sendMessage(dto: { conversationId: string; channelConfigId: string; body: string }): Promise<Message> {
  const res = await api.post<Message>('/messages/send', dto);
  return res.data;
}
