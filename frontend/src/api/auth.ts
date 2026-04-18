import { api } from './client';
import type { LoginResponse } from '@/types/api';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', { email, password });
  return res.data;
}
