import { api } from './client';

export interface CustomerOrigin {
  id: string;
  name: string;
  createdAt: string;
}

export const listCustomerOrigins = (): Promise<CustomerOrigin[]> =>
  api.get('/customer-origins').then((r) => r.data);

export const createCustomerOrigin = (name: string): Promise<CustomerOrigin> =>
  api.post('/customer-origins', { name }).then((r) => r.data);

export const updateCustomerOrigin = (id: string, name: string): Promise<CustomerOrigin> =>
  api.patch(`/customer-origins/${id}`, { name }).then((r) => r.data);

export const deleteCustomerOrigin = (id: string): Promise<void> =>
  api.delete(`/customer-origins/${id}`).then((r) => r.data);
