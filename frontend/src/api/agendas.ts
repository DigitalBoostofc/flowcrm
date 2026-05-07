import { api } from './client';

export interface Agenda {
  id: string;
  name: string;
  ownerId: string | null;
  ownerName: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listAgendas(): Promise<Agenda[]> {
  const res = await api.get<Agenda[]>('/agendas');
  return res.data;
}

export async function createAgenda(dto: { name: string; ownerId?: string; ownerName?: string }): Promise<Agenda> {
  const res = await api.post<Agenda>('/agendas', dto);
  return res.data;
}

export async function updateAgenda(id: string, dto: { name?: string; ownerId?: string | null; ownerName?: string | null; isActive?: boolean }): Promise<Agenda> {
  const res = await api.patch<Agenda>(`/agendas/${id}`, dto);
  return res.data;
}

export async function deleteAgenda(id: string): Promise<void> {
  await api.delete(`/agendas/${id}`);
}

export async function createAppointment(agendaId: string, dto: {
  title: string; startAt: string; endAt: string;
  leadId?: string; contactId?: string; description?: string; notes?: string;
}): Promise<unknown> {
  const res = await api.post(`/agendas/${agendaId}/appointments`, dto);
  return res.data;
}
