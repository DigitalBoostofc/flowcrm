import { api } from './client';

export async function getGoogleAuthUrl(): Promise<string> {
  const res = await api.get<{ url: string }>('/integrations/google/auth-url');
  return res.data.url;
}

export async function getGoogleStatus(): Promise<{ connected: boolean; email?: string }> {
  const res = await api.get<{ connected: boolean; email?: string }>('/integrations/google/status');
  return res.data;
}

export async function disconnectGoogle(): Promise<void> {
  await api.delete('/integrations/google');
}
