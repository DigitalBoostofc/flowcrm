import { api } from './client';

export type RequiredFieldTarget = 'lead' | 'company' | 'contact';

export interface StageRequiredField {
  id: string;
  stageId: string;
  targetType: RequiredFieldTarget;
  fieldKey: string;
  question: string | null;
  position: number;
  createdAt: string;
}

export const listStageRequiredFields = (stageId: string): Promise<StageRequiredField[]> =>
  api.get(`/stages/${stageId}/required-fields`).then((r) => r.data);

export const createStageRequiredField = (
  stageId: string,
  dto: { targetType: RequiredFieldTarget; fieldKey: string; question?: string | null },
): Promise<StageRequiredField> =>
  api.post(`/stages/${stageId}/required-fields`, dto).then((r) => r.data);

export const updateStageRequiredField = (
  stageId: string,
  id: string,
  dto: { question?: string | null },
): Promise<StageRequiredField> =>
  api.patch(`/stages/${stageId}/required-fields/${id}`, dto).then((r) => r.data);

export const deleteStageRequiredField = (stageId: string, id: string): Promise<void> =>
  api.delete(`/stages/${stageId}/required-fields/${id}`).then((r) => r.data);
