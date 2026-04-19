import { api } from './client';
import type { LoginResponse, User } from '@/types/api';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', { email, password });
  return res.data;
}

export async function me(): Promise<User> {
  const res = await api.get<User>('/auth/me');
  return res.data;
}

export async function forgotPassword(email: string): Promise<{ maskedPhone: string }> {
  const res = await api.post<{ maskedPhone: string }>('/auth/forgot-password', { email });
  return res.data;
}

export async function verifyResetCode(email: string, code: string): Promise<{ resetToken: string }> {
  const res = await api.post<{ resetToken: string }>('/auth/verify-reset-code', { email, code });
  return res.data;
}

export async function resetPassword(resetToken: string, newPassword: string): Promise<void> {
  await api.post('/auth/reset-password', { resetToken, newPassword });
}
