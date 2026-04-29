import { api } from './client';

export type TrashType = 'leads' | 'contacts' | 'companies' | 'products';
export const TRASH_TYPES: TrashType[] = ['leads', 'contacts', 'companies', 'products'];

export interface TrashItem {
  type: TrashType;
  id: string;
  label: string;
  deletedAt: string;
  daysUntilPurge: number;
}

export interface TrashListResponse {
  retentionDays: number;
  items: Record<TrashType, TrashItem[]>;
}

export interface TrashListByTypeResponse {
  retentionDays: number;
  items: TrashItem[];
}

export async function getTrash(): Promise<TrashListResponse> {
  const res = await api.get<TrashListResponse>('/trash');
  return res.data;
}

export async function getTrashByType(type: TrashType): Promise<TrashListByTypeResponse> {
  const res = await api.get<TrashListByTypeResponse>(`/trash/${type}`);
  return res.data;
}

export async function restoreFromTrash(type: TrashType, id: string): Promise<void> {
  await api.post(`/trash/${type}/${id}/restore`);
}

export async function purgeFromTrash(type: TrashType, id: string): Promise<void> {
  await api.delete(`/trash/${type}/${id}`);
}
