import { api } from './client';
import type { Contact, ContactPrivacy } from '@/types/api';

export interface CreateContactInput {
  name: string;
  phone?: string;
  email?: string;
  origin?: string;
  company?: string;
  role?: string;
  website?: string;
  zipCode?: string;
  channelOrigin?: string;
  categoria?: string;
  responsibleId?: string;
  cpf?: string;
  birthDay?: string;
  birthYear?: number;
  origem?: string;
  descricao?: string;
  whatsapp?: string;
  celular?: string;
  fax?: string;
  ramal?: string;
  pais?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  produtos?: string[];
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  skype?: string;
  instagram?: string;
  privacy?: ContactPrivacy;
  additionalAccessUserIds?: string[];
}

export async function listContacts(search?: string): Promise<Contact[]> {
  const res = await api.get<Contact[]>('/contacts', { params: search ? { search } : {} });
  return res.data;
}

export async function getContact(id: string): Promise<Contact> {
  const res = await api.get<Contact>(`/contacts/${id}`);
  return res.data;
}

export async function createContact(data: CreateContactInput): Promise<Contact> {
  const res = await api.post<Contact>('/contacts', data);
  return res.data;
}

export async function updateContact(
  id: string,
  data: Partial<CreateContactInput>,
): Promise<Contact> {
  const res = await api.patch<Contact>(`/contacts/${id}`, data);
  return res.data;
}

export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/contacts/${id}`);
}

export async function uploadContactAvatar(id: string, file: File): Promise<Contact> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<Contact>(`/contacts/${id}/avatar`, form);
  return res.data;
}

export async function removeContactAvatar(id: string): Promise<Contact> {
  const res = await api.delete<Contact>(`/contacts/${id}/avatar`);
  return res.data;
}
