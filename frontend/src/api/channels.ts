import { api } from './client';
import type { ChannelConfig } from '@/types/api';

export async function listChannels(): Promise<ChannelConfig[]> {
  const res = await api.get<ChannelConfig[]>('/channels');
  return res.data;
}
