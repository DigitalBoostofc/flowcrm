import { api } from './client';

export interface AnalyticsSummary {
  totals: { active: number; won: number; lost: number; frozen: number; total: number };
  values: { active: number; won: number; lost: number; frozen: number; forecast: number };
  conversionRate: number;
  avgDaysToWin: number;
  avgTicket: number;
  byStage: { stageId: string; stageName: string; count: number; value: number }[];
  byAgent: { agentId: string; name: string; active: number; won: number; lost: number; frozen: number; value: number }[];
  topLossReasons: { reason: string; count: number }[];
  leadsByDay: Record<string, number>;
  revenueByOrigin: { origin: string; count: number; value: number }[];
  neglectedLeads: { id: string; title: string | null; contactName: string | null; assignedTo: string; daysSinceUpdate: number }[];
}

export const getAnalyticsSummary = (pipelineId?: string): Promise<AnalyticsSummary> =>
  api.get('/analytics/summary', { params: pipelineId ? { pipelineId } : {} }).then((r) => r.data);
