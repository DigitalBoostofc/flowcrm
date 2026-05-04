import { api } from './client';
import type { QuickReply } from '@/types/api';

export async function listQuickReplies(search?: string): Promise<QuickReply[]> {
  const res = await api.get<QuickReply[]>('/quick-replies', { params: search ? { search } : undefined });
  return res.data;
}

export async function createQuickReply(dto: { title: string; shortcut?: string; body: string; category?: string }): Promise<QuickReply> {
  const res = await api.post<QuickReply>('/quick-replies', dto);
  return res.data;
}

export async function updateQuickReply(id: string, dto: Partial<{ title: string; shortcut: string; body: string; category: string }>): Promise<QuickReply> {
  const res = await api.put<QuickReply>(`/quick-replies/${id}`, dto);
  return res.data;
}

export async function deleteQuickReply(id: string): Promise<void> {
  await api.delete(`/quick-replies/${id}`);
}
