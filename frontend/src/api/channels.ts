import { api } from './client';
import type { ChannelConfig } from '@/types/api';

export async function listChannels(): Promise<ChannelConfig[]> {
  const res = await api.get<ChannelConfig[]>('/channels');
  return res.data;
}

export async function createChannel(dto: {
  name: string;
  type: 'evolution' | 'uazapi' | 'meta';
  config: Record<string, string>;
}) {
  const res = await api.post<ChannelConfig>('/channels', dto);
  return res.data;
}

export async function deleteChannel(id: string): Promise<void> {
  await api.delete(`/channels/${id}`);
}

export async function provisionChannel(id: string): Promise<{ ok: boolean; webhookUrl: string; qrCode?: string }> {
  // Timeout maior: criar instância + webhook + conectar pode levar >15s
  const res = await api.post<{ ok: boolean; webhookUrl: string; qrCode?: string }>(`/channels/${id}/provision`, {}, { timeout: 45000 });
  return res.data;
}

export async function refreshChannelWebhook(id: string): Promise<{ ok: boolean; webhookUrl: string }> {
  const res = await api.post<{ ok: boolean; webhookUrl: string }>(`/channels/${id}/refresh-webhook`, {}, { timeout: 20000 });
  return res.data;
}

export async function getChannelQr(id: string): Promise<{ base64: string; pairingCode?: string; connected?: boolean; phone?: string }> {
  const res = await api.get(`/channels/${id}/qr`, { headers: { Accept: 'application/json' } });
  return res.data;
}

export async function getChannel(id: string): Promise<ChannelConfig> {
  const res = await api.get<ChannelConfig>(`/channels/${id}`);
  return res.data;
}
