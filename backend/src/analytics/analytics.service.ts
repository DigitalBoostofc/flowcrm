import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../leads/entities/lead.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Lead)
    private leads: Repository<Lead>,
    private readonly tenant: TenantContext,
  ) {}

  async getSummary(pipelineId?: string) {
    const workspaceId = this.tenant.requireWorkspaceId();
    const where: any = { workspaceId };
    if (pipelineId) where.pipelineId = pipelineId;

    const all = await this.leads.find({
      where,
      relations: ['stage', 'assignedTo'],
    });

    const active = all.filter((l) => l.status === LeadStatus.ACTIVE);
    const won = all.filter((l) => l.status === LeadStatus.WON);
    const lost = all.filter((l) => l.status === LeadStatus.LOST);

    const sum = (arr: Lead[]) =>
      arr.reduce((acc, l) => acc + (Number(l.value) || 0), 0);

    const conversionRate =
      won.length + lost.length > 0
        ? Math.round((won.length / (won.length + lost.length)) * 100)
        : 0;

    const avgDaysToWin =
      won.length > 0
        ? Math.round(
            won.reduce((acc, l) => {
              const days =
                (new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime()) /
                86400000;
              return acc + days;
            }, 0) / won.length,
          )
        : 0;

    const byStage: Record<string, { count: number; value: number; stageName: string }> = {};
    for (const l of active) {
      if (!byStage[l.stageId]) {
        byStage[l.stageId] = { count: 0, value: 0, stageName: l.stage?.name ?? '' };
      }
      byStage[l.stageId].count++;
      byStage[l.stageId].value += Number(l.value) || 0;
    }

    const byAgent: Record<string, { name: string; active: number; won: number; lost: number; value: number }> = {};
    for (const l of all) {
      const key = l.assignedToId ?? '__unassigned__';
      if (!byAgent[key]) {
        byAgent[key] = { name: l.assignedTo?.name ?? 'Sem responsável', active: 0, won: 0, lost: 0, value: 0 };
      }
      byAgent[key][l.status as 'active' | 'won' | 'lost']++;
      byAgent[key].value += Number(l.value) || 0;
    }

    const lossReasonCount: Record<string, number> = {};
    for (const l of lost) {
      const reason = l.lossReason ?? 'Sem motivo';
      lossReasonCount[reason] = (lossReasonCount[reason] ?? 0) + 1;
    }
    const topLossReasons = Object.entries(lossReasonCount)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLeads = all.filter((l) => new Date(l.createdAt) >= thirtyDaysAgo);
    const leadsByDay: Record<string, number> = {};
    for (const l of recentLeads) {
      const day = new Date(l.createdAt).toISOString().split('T')[0];
      leadsByDay[day] = (leadsByDay[day] ?? 0) + 1;
    }

    return {
      totals: { active: active.length, won: won.length, lost: lost.length, total: all.length },
      values: { active: sum(active), won: sum(won), lost: sum(lost), forecast: sum(active) },
      conversionRate,
      avgDaysToWin,
      byStage: Object.entries(byStage).map(([stageId, data]) => ({ stageId, ...data })),
      byAgent: Object.entries(byAgent).map(([agentId, data]) => ({ agentId, ...data })),
      topLossReasons,
      leadsByDay,
    };
  }
}
