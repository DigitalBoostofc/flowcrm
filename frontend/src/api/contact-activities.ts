import { api } from './client';

export interface ContactActivity {
  id: string;
  contactId?: string | null;
  companyId?: string | null;
  type: string;
  body: string;
  createdById?: string;
  createdBy?: { id: string; name: string };
  scheduledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export const getContactActivities = (contactId: string): Promise<ContactActivity[]> =>
  api.get(`/contacts/${contactId}/activities`).then(r => r.data);

export const createContactActivity = (
  contactId: string,
  data: { type: string; body: string; scheduledAt?: string },
): Promise<ContactActivity> =>
  api.post(`/contacts/${contactId}/activities`, data).then(r => r.data);

export const getCompanyActivities = (companyId: string): Promise<ContactActivity[]> =>
  api.get(`/companies/${companyId}/activities`).then(r => r.data);

export const createCompanyActivity = (
  companyId: string,
  data: { type: string; body: string; scheduledAt?: string },
): Promise<ContactActivity> =>
  api.post(`/companies/${companyId}/activities`, data).then(r => r.data);

export const updateContactActivity = (
  id: string,
  data: { body?: string; scheduledAt?: string | null },
): Promise<ContactActivity> =>
  api.patch(`/contact-activities/${id}`, data).then(r => r.data);

export const completeContactActivity = (id: string): Promise<ContactActivity> =>
  api.patch(`/contact-activities/${id}/complete`).then(r => r.data);

export const deleteContactActivity = (id: string): Promise<void> =>
  api.delete(`/contact-activities/${id}`).then(() => undefined);
