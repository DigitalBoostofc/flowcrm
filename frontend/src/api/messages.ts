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

export async function sendMedia(dto: {
  conversationId: string;
  channelConfigId: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  base64?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaCaption?: string;
  mediaFileName?: string;
}): Promise<Message> {
  const res = await api.post<Message>('/messages/send-media', dto);
  return res.data;
}

export async function reactMessage(dto: { messageId: string; channelConfigId: string; emoji: string }): Promise<void> {
  await api.post('/messages/react', dto);
}

export async function deleteMessage(id: string, dto: { messageId: string; channelConfigId: string }): Promise<void> {
  await api.delete(`/messages/${id}`, { data: dto });
}
