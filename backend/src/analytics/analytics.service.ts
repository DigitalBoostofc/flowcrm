import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../leads/entities/lead.entity';
import { Pipeline } from '../pipelines/entities/pipeline.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Lead)
    private leads: Repository<Lead>,
    @InjectRepository(Pipeline)
    private pipelines: Repository<Pipeline>,
    private readonly tenant: TenantContext,
  ) {}

  async getSummary(pipelineId?: string) {
    const workspaceId = this.tenant.requireWorkspaceId();

    const qb = this.leads.createQueryBuilder('l')
      .leftJoin('l.stage', 's')
      .leftJoin('l.assignedTo', 'u')
      .leftJoin('l.pipeline', 'p')
      .where('l.workspaceId = :workspaceId', { workspaceId })
      .andWhere('l.archivedAt IS NULL');

    if (pipelineId) {
      qb.andWhere('l.pipelineId = :pipelineId', { pipelineId });
    } else {
      qb.andWhere("p.kind = 'sale'");
    }

    // Run all aggregations in parallel with a single shared query each
    const [totalsRows, byStageRows, byAgentRows, lossRows, leadsByDayRows, avgWinRow] =
      await Promise.all([
        // totals + values per status
        qb.clone()
          .select('l.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .addSelect('COALESCE(SUM(l.value), 0)', 'total_value')
          .groupBy('l.status')
          .getRawMany(),

        // byStage (active only)
        qb.clone()
          .select('l.stageId', 'stageId')
          .addSelect('s.name', 'stageName')
          .addSelect('COUNT(*)', 'count')
          .addSelect('COALESCE(SUM(l.value), 0)', 'value')
          .where('l.workspaceId = :workspaceId', { workspaceId })
          .andWhere('l.archivedAt IS NULL')
          .andWhere('l.status = :status', { status: LeadStatus.ACTIVE })
          .andWhere(pipelineId ? 'l.pipelineId = :pipelineId' : "p.kind = 'sale'", pipelineId ? { pipelineId } : {})
          .groupBy('l.stageId')
          .addGroupBy('s.name')
          .getRawMany(),

        // byAgent
        qb.clone()
          .select("COALESCE(l.assignedToId, '__unassigned__')", 'agentId')
          .addSelect("COALESCE(u.name, 'Sem responsável')", 'name')
          .addSelect('l.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .addSelect('COALESCE(SUM(l.value), 0)', 'value')
          .groupBy('l.assignedToId')
          .addGroupBy('u.name')
          .addGroupBy('l.status')
          .getRawMany(),

        // loss reasons (top 5)
        qb.clone()
          .select("COALESCE(l.lossReason, 'Sem motivo')", 'reason')
          .addSelect('COUNT(*)', 'count')
          .where('l.workspaceId = :workspaceId', { workspaceId })
          .andWhere('l.archivedAt IS NULL')
          .andWhere('l.status = :status', { status: LeadStatus.LOST })
          .andWhere(pipelineId ? 'l.pipelineId = :pipelineId' : "p.kind = 'sale'", pipelineId ? { pipelineId } : {})
          .groupBy('l.lossReason')
          .orderBy('count', 'DESC')
          .limit(5)
          .getRawMany(),

        // leads created per day (last 30 days)
        qb.clone()
          .select("TO_CHAR(l.createdAt, 'YYYY-MM-DD')", 'day')
          .addSelect('COUNT(*)', 'count')
          .where('l.workspaceId = :workspaceId', { workspaceId })
          .andWhere('l.archivedAt IS NULL')
          .andWhere('l.createdAt >= NOW() - INTERVAL \'30 days\'')
          .andWhere(pipelineId ? 'l.pipelineId = :pipelineId' : "p.kind = 'sale'", pipelineId ? { pipelineId } : {})
          .groupBy("TO_CHAR(l.createdAt, 'YYYY-MM-DD')")
          .getRawMany(),

        // avg days to win
        qb.clone()
          .select('AVG(EXTRACT(EPOCH FROM (l.updatedAt - l.createdAt)) / 86400)', 'avgDays')
          .where('l.workspaceId = :workspaceId', { workspaceId })
          .andWhere('l.archivedAt IS NULL')
          .andWhere('l.status = :status', { status: LeadStatus.WON })
          .andWhere(pipelineId ? 'l.pipelineId = :pipelineId' : "p.kind = 'sale'", pipelineId ? { pipelineId } : {})
          .getRawOne(),
      ]);

    // Totals
    const totals = { active: 0, won: 0, lost: 0, total: 0 };
    const values = { active: 0, won: 0, lost: 0, forecast: 0 };
    for (const r of totalsRows) {
      const c = parseInt(r.count, 10);
      const v = parseFloat(r.total_value);
      if (r.status === LeadStatus.ACTIVE) { totals.active = c; values.active = v; values.forecast = v; }
      else if (r.status === LeadStatus.WON) { totals.won = c; values.won = v; }
      else if (r.status === LeadStatus.LOST) { totals.lost = c; }
    }
    totals.total = totals.active + totals.won + totals.lost;

    const conversionRate = totals.won + totals.lost > 0
      ? Math.round((totals.won / (totals.won + totals.lost)) * 100)
      : 0;
    const avgDaysToWin = Math.round(parseFloat(avgWinRow?.avgDays ?? '0') || 0);

    // byStage
    const byStage = byStageRows.map((r) => ({
      stageId: r.stageId,
      stageName: r.stageName ?? '',
      count: parseInt(r.count, 10),
      value: parseFloat(r.value),
    }));

    // byAgent
    const agentMap: Record<string, { name: string; active: number; won: number; lost: number; value: number }> = {};
    for (const r of byAgentRows) {
      const key = r.agentId;
      if (!agentMap[key]) agentMap[key] = { name: r.name, active: 0, won: 0, lost: 0, value: 0 };
      agentMap[key][r.status as 'active' | 'won' | 'lost'] += parseInt(r.count, 10);
      agentMap[key].value += parseFloat(r.value);
    }
    const byAgent = Object.entries(agentMap).map(([agentId, data]) => ({ agentId, ...data }));

    const topLossReasons = lossRows.map((r) => ({ reason: r.reason, count: parseInt(r.count, 10) }));

    const leadsByDay: Record<string, number> = {};
    for (const r of leadsByDayRows) leadsByDay[r.day] = parseInt(r.count, 10);

    return { totals, values, conversionRate, avgDaysToWin, byStage, byAgent, topLossReasons, leadsByDay };
  }
}
