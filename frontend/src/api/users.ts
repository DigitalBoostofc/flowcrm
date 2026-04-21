import { api } from './client';
import type { User } from '@/types/api';

export async function listUsers(): Promise<User[]> {
  const res = await api.get<User[]>('/users');
  return res.data;
}

export async function createUser(dto: { name: string; email: string; password: string; role: 'manager' | 'seller' | 'agent' }): Promise<User> {
  const res = await api.post<User>('/users', dto);
  return res.data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function updateUserRole(id: string, role: 'manager' | 'seller' | 'agent'): Promise<User> {
  const res = await api.patch<User>(`/users/${id}/role`, { role });
  return res.data;
}

export async function setUserActive(id: string, active: boolean): Promise<void> {
  await api.patch(`/users/${id}/active`, { active });
}

export async function getMe(): Promise<User> {
  const res = await api.get<User>('/users/me');
  return res.data;
}

export async function updateMe(dto: { name?: string; phone?: string }): Promise<User> {
  const res = await api.patch<User>('/users/me', dto);
  return res.data;
}

export async function uploadMyAvatar(file: File): Promise<User> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<User>('/users/me/avatar', form);
  return res.data;
}

export async function removeMyAvatar(): Promise<User> {
  const res = await api.delete<User>('/users/me/avatar');
  return res.data;
}

export type ProfileOtpPurpose = 'email_change' | 'password_change';

export async function sendProfileOtp(purpose: ProfileOtpPurpose): Promise<{ maskedPhone: string }> {
  const res = await api.post<{ maskedPhone: string }>('/users/me/otp/send', { purpose });
  return res.data;
}

export async function verifyProfileOtp(purpose: ProfileOtpPurpose, code: string): Promise<{ otpToken: string }> {
  const res = await api.post<{ otpToken: string }>('/users/me/otp/verify', { purpose, code });
  return res.data;
}

export async function changeMyEmail(dto: { email: string; otpToken: string }): Promise<User> {
  const res = await api.patch<User>('/users/me/email', dto);
  return res.data;
}

export async function changeMyPassword(dto: { newPassword: string; otpToken: string }): Promise<void> {
  await api.patch('/users/me/password', dto);
}
