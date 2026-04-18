import { api } from './client';
import type { Contact } from '@/types/api';

export async function listContacts(search?: string): Promise<Contact[]> {
  const res = await api.get<Contact[]>('/contacts', { params: search ? { search } : {} });
  return res.data;
}

export async function getContact(id: string): Promise<Contact> {
  const res = await api.get<Contact>(`/contacts/${id}`);
  return res.data;
}

export async function updateContact(
  id: string,
  data: { name?: string; phone?: string; email?: string; origin?: string },
): Promise<Contact> {
  const res = await api.patch<Contact>(`/contacts/${id}`, data);
  return res.data;
}
