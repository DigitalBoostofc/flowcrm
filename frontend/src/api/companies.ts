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
