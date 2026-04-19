import { api } from './client';
import type { LoginResponse } from '@/types/api';

export interface SignupStartInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  workspaceName: string;
}

export interface SignupStartResponse {
  otpId: string;
  expiresAt: string;
}

export async function signupStart(input: SignupStartInput): Promise<SignupStartResponse> {
  const res = await api.post<SignupStartResponse>('/signup/start', input);
  return res.data;
}

export async function signupVerify(otpId: string, code: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/signup/verify', { otpId, code });
  return res.data;
}

export async function signupResend(otpId: string): Promise<{ expiresAt: string }> {
  const res = await api.post<{ expiresAt: string }>('/signup/resend', { otpId });
  return res.data;
}

export interface AppSettings {
  id: string;
  systemChannelConfigId: string | null;
  signupEnabled: boolean;
  trialDays: number;
  updatedAt: string;
}

export async function getAppSettings(): Promise<AppSettings> {
  const res = await api.get<AppSettings>('/app-settings');
  return res.data;
}

export async function updateAppSettings(data: Partial<Pick<AppSettings, 'systemChannelConfigId' | 'signupEnabled' | 'trialDays'>>): Promise<AppSettings> {
  const res = await api.put<AppSettings>('/app-settings', data);
  return res.data;
}
