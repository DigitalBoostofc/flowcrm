import { api } from './client';
import type { Pipeline } from '@/types/api';

export async function listPipelines(): Promise<Pipeline[]> {
  const res = await api.get<Pipeline[]>('/pipelines');
  return res.data;
}

export async function getPipeline(id: string): Promise<Pipeline> {
  const res = await api.get<Pipeline>(`/pipelines/${id}`);
  return res.data;
}

export async function createPipeline(dto: { name: string; isDefault?: boolean }): Promise<Pipeline> {
  const res = await api.post<Pipeline>('/pipelines', dto);
  return res.data;
}

export async function deletePipeline(id: string): Promise<void> {
  await api.delete(`/pipelines/${id}`);
}
