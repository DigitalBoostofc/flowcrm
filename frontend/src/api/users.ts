import { api } from './client';
import type { User } from '@/types/api';

export async function listUsers(): Promise<User[]> {
  const res = await api.get<User[]>('/users');
  return res.data;
}

export async function createUser(dto: { name: string; email: string; password: string; role: 'owner' | 'agent' }): Promise<User> {
  const res = await api.post<User>('/users', dto);
  return res.data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
