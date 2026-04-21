import { api } from './client';

export async function getAllPreferences(): Promise<Record<string, unknown>> {
  const { data } = await api.get('/me/preferences');
  return data ?? {};
}

export async function setPreference(key: string, value: unknown): Promise<void> {
  await api.put(`/me/preferences/${encodeURIComponent(key)}`, { value });
}

export async function deletePreference(key: string): Promise<void> {
  await api.delete(`/me/preferences/${encodeURIComponent(key)}`);
}
