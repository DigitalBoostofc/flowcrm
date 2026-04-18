import { api } from './client';

export interface LossReason {
  id: string;
  label: string;
  createdAt: string;
}

export const listLossReasons = (): Promise<LossReason[]> =>
  api.get('/loss-reasons').then((r) => r.data);

export const createLossReason = (label: string): Promise<LossReason> =>
  api.post('/loss-reasons', { label }).then((r) => r.data);

export const deleteLossReason = (id: string): Promise<void> =>
  api.delete(`/loss-reasons/${id}`).then((r) => r.data);
