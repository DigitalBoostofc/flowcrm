import { api } from './client';
import type { ChannelConfig } from '@/types/api';

export async function listChannels(): Promise<ChannelConfig[]> {
  const res = await api.get<ChannelConfig[]>('/channels');
  return res.data;
}

export async function createChannel(dto: {
  name: string;
  type: 'evolution';
  config: Record<string, string>;
}) {
  const res = await api.post<ChannelConfig>('/channels', dto);
  return res.data;
}

export async function deleteChannel(id: string): Promise<void> {
  await api.delete(`/channels/${id}`);
}

export async function provisionChannel(id: string): Promise<{ ok: boolean; webhookUrl: string }> {
  const res = await api.post<{ ok: boolean; webhookUrl: string }>(`/channels/${id}/provision`);
  return res.data;
}

export async function getChannelQr(id: string): Promise<{ base64: string; pairingCode?: string }> {
  const res = await api.get(`/channels/${id}/qr`, { headers: { Accept: 'application/json' } });
  return res.data;
}
