import { api } from './client';

export interface DataExportResponse {
  exportedAt: string;
  user: Record<string, unknown>;
  workspace: Record<string, unknown> | null;
  leads: unknown[];
  contacts: unknown[];
  companies: unknown[];
  products: unknown[];
}

export async function fetchDataExport(): Promise<DataExportResponse> {
  const res = await api.get<DataExportResponse>('/me/data-export');
  return res.data;
}

/**
 * Triggers a JSON download in the browser of the user's data export. Used by
 * the "Baixar meus dados" button — LGPD art. 18, II.
 */
export async function downloadDataExport(): Promise<void> {
  const data = await fetchDataExport();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `meus-dados-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ScheduleDeletionResponse {
  scheduledDeletionAt: string;
}

export async function scheduleAccountDeletion(): Promise<ScheduleDeletionResponse> {
  const res = await api.delete<ScheduleDeletionResponse>('/me/account');
  return res.data;
}

export async function cancelAccountDeletion(): Promise<void> {
  await api.post('/me/account/restore');
}
