import { api } from './client';

export interface Sector {
  id: string;
  name: string;
  createdAt: string;
}

export const listSectors = (): Promise<Sector[]> =>
  api.get('/sectors').then((r) => r.data);

export const createSector = (name: string): Promise<Sector> =>
  api.post('/sectors', { name }).then((r) => r.data);

export const updateSector = (id: string, name: string): Promise<Sector> =>
  api.patch(`/sectors/${id}`, { name }).then((r) => r.data);

export const deleteSector = (id: string): Promise<void> =>
  api.delete(`/sectors/${id}`).then((r) => r.data);
