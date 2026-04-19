import { api } from './client';

export interface CustomerCategory {
  id: string;
  name: string;
  createdAt: string;
}

export const listCustomerCategories = (): Promise<CustomerCategory[]> =>
  api.get('/customer-categories').then((r) => r.data);

export const createCustomerCategory = (name: string): Promise<CustomerCategory> =>
  api.post('/customer-categories', { name }).then((r) => r.data);

export const updateCustomerCategory = (id: string, name: string): Promise<CustomerCategory> =>
  api.patch(`/customer-categories/${id}`, { name }).then((r) => r.data);

export const deleteCustomerCategory = (id: string): Promise<void> =>
  api.delete(`/customer-categories/${id}`).then((r) => r.data);
