import { api } from './client';
import type { Stage } from '@/types/api';

export async function createStage(
  pipelineId: string,
  dto: { name: string; position?: number; color?: string; timeLimitDays?: number | null },
): Promise<Stage> {
  const res = await api.post<Stage>(`/pipelines/${pipelineId}/stages`, dto);
  return res.data;
}

export async function updateStage(
  pipelineId: string,
  stageId: string,
  dto: { name?: string; position?: number; color?: string; timeLimitDays?: number | null },
): Promise<Stage> {
  const res = await api.patch<Stage>(`/pipelines/${pipelineId}/stages/${stageId}`, dto);
  return res.data;
}

export async function deleteStage(pipelineId: string, stageId: string): Promise<void> {
  await api.delete(`/pipelines/${pipelineId}/stages/${stageId}`);
}
