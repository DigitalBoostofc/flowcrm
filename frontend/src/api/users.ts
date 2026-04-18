import { api } from './client';
import type { User } from '@/types/api';

export async function listUsers(): Promise<User[]> {
  const res = await api.get<User[]>('/users');
  return res.data;
}
