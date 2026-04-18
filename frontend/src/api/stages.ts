import { api } from './client';
import type { Stage } from '@/types/api';

export async function createStage(pipelineId: string, dto: { name: string; position?: number; color?: string }): Promise<Stage> {
  const res = await api.post<Stage>(`/pipelines/${pipelineId}/stages`, dto);
  return res.data;
}
