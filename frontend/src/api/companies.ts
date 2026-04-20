import { api } from './client';
import type { Company } from '@/types/api';

export async function listCompanies(search?: string): Promise<Company[]> {
  const res = await api.get<Company[]>('/companies', { params: search ? { search } : {} });
  return res.data;
}

export async function getCompany(id: string): Promise<Company> {
  const res = await api.get<Company>(`/companies/${id}`);
  return res.data;
}

export type CreateCompanyInput = Partial<Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'responsible'>> & {
  name: string;
};

export async function createCompany(data: CreateCompanyInput): Promise<Company> {
  const res = await api.post<Company>('/companies', data);
  return res.data;
}

export async function updateCompany(id: string, data: Partial<CreateCompanyInput>): Promise<Company> {
  const res = await api.patch<Company>(`/companies/${id}`, data);
  return res.data;
}

export async function deleteCompany(id: string): Promise<void> {
  await api.delete(`/companies/${id}`);
}

export async function uploadCompanyAvatar(id: string, file: File): Promise<Company> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<Company>(`/companies/${id}/avatar`, form);
  return res.data;
}

export async function removeCompanyAvatar(id: string): Promise<Company> {
  const res = await api.delete<Company>(`/companies/${id}/avatar`);
  return res.data;
}
