import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../leads/entities/lead.entity';
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

    const p: any[] = [workspaceId];
    let piFilter = '';
    if (pipelineId) {
      p.push(pipelineId);
      piFilter = `AND l."pipelineId" = $${p.length}`;
    }

    // Shared WHERE clause (no JOINs — each query declares its own)
    const w = `l."workspaceId" = $1
               AND l."archivedAt" IS NULL
               AND l."deletedAt" IS NULL
               AND p.kind = 'sale'
               ${piFilter}`;

    const [
      totalsRows,
      byStageRows,
      byAgentRows,
      lossRows,
      leadsByDayRows,
      avgWinRows,
      revenueByOriginRows,
      neglectedRows,
    ] = await Promise.all([

      // totals + values per status
      this.leads.query(`
        SELECT l.status,
               COUNT(*)::int AS count,
               COALESCE(SUM(l.value), 0)::float AS total_value
        FROM leads l
        LEFT JOIN pipelines p ON p.id = l."pipelineId"
        WHERE ${w}
        GROUP BY l.status
      `, p),

      // byStage — active leads only
      this.leads.query(`
        SELECT l."stageId",
               s.name AS "stageName",
               COUNT(*)::int AS count,
               COALESCE(SUM(l.value), 0)::float AS value
        FROM leads l
        LEFT JOIN pipelines p ON p.id = l."pipelineId"
        LEFT JOIN stages    s ON s.id = l."stageId"
        WHERE ${w} AND l.status = 'active'
        GROUP BY l."stageId", s.name
      `, p),

      // byAgent — pivot in SQL to avoid JS aggregation
      this.leads.query(`
        SELECT
          COALESCE(l."assignedToId"::text, '__unassigned__')       AS "agentId",
          COALESCE(u.name, 'Sem responsável')                       AS name,
          COUNT(*) FILTER (WHERE l.status = 'active')::int          AS active,
          COUNT(*) FILTER (WHERE l.status = 'won')::int             AS won,
          COUNT(*) FILTER (WHERE l.status = 'lost')::int            AS lost,
          COUNT(*) FILTER (WHERE l.status = 'frozen')::int          AS frozen,
          COALESCE(SUM(l.value) FILTER (WHERE l.status = 'won'), 0)::float AS value
        FROM leads l
        LEFT JOIN pipelines p ON p.id = l."pipelineId"
        LEFT JOIN users     u ON u.id = l."assignedToId"
        WHERE ${w}
        GROUP BY l."assignedToId", u.name
        ORDER BY value DESC
      `, p),

      // top 5 loss reasons
      this.leads.query(`
        SELECT COALESCE(l."lossReason", 'Sem motivo') AS reason,
               COUNT(*)::int AS count
        FROM leads l
        LEFT JOIN pipelines p ON p.id = l."pipelineId"
        WHERE ${w} AND l.status = 'lost'
        GROUP BY l."lossReason"
        ORDER BY count DESC
        LIMIT 5
      `, p),

      // leads created per day — last 14 days
      this.leads.query(`
        SELECT TO_CHAR(l."createdAt", 'YYYY-MM-DD') AS day,
               COUNT(*)::int AS count
        FROM leads l
        LEFT JOIN pipelines p ON p.id = l."pipelineId"
        WHERE ${w} AND l."createdAt" >= NOW() - INTERVAL '14 days'
        GROUP BY TO_CHAR(l."createdAt", 'YYYY-MM-DD')
      `, p),

      // avg days to win (createdAt → first won)
      this.leads.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (l."updatedAt" - l."createdAt")) / 86400)::float AS "avgDays"
        FROM leads l
        LEFT JOIN pipelines p ON p.id = l."pipelineId"
        WHERE ${w} AND l.status = 'won'
      `, p),

      // revenue by contact origin (won only)
      this.leads.query(`
        SELECT COALESCE(c.origin, 'Sem origem') AS origin,
               COUNT(*)::int AS count,
               COALESCE(SUM(l.value), 0)::float AS value
        FROM leads l
        LEFT JOIN pipelines p ON p.id = l."pipelineId"
        LEFT JOIN contacts  c ON c.id = l."contactId"
        WHERE ${w} AND l.status = 'won'
        GROUP BY COALESCE(c.origin, 'Sem origem')
        ORDER BY value DESC
        LIMIT 8
      `, p),

      // neglected active leads (no update in 14+ days)
      this.leads.query(`
        SELECT l.id,
               l.title,
               c.name AS "contactName",
               COALESCE(u.name, 'Sem responsável') AS "assignedTo",
               EXTRACT(DAY FROM NOW() - l."updatedAt")::int AS "daysSinceUpdate"
        FROM leads l
        LEFT JOIN pipelines p ON p.id = l."pipelineId"
        LEFT JOIN contacts  c ON c.id = l."contactId"
        LEFT JOIN users     u ON u.id = l."assignedToId"
        WHERE ${w}
          AND l.status = 'active'
          AND l."updatedAt" < NOW() - INTERVAL '14 days'
        ORDER BY l."updatedAt" ASC
        LIMIT 10
      `, p),
    ]);

    // Totals
    const totals = { active: 0, won: 0, lost: 0, frozen: 0, total: 0 };
    const values = { active: 0, won: 0, lost: 0, frozen: 0, forecast: 0 };
    for (const r of totalsRows) {
      const c = r.count as number;
      const v = r.total_value as number;
      if (r.status === 'active')      { totals.active = c; values.active = v; values.forecast = v; }
      else if (r.status === 'won')    { totals.won = c; values.won = v; }
      else if (r.status === 'lost')   { totals.lost = c; }
      else if (r.status === 'frozen') { totals.frozen = c; values.frozen = v; }
    }
    totals.total = totals.active + totals.won + totals.lost + totals.frozen;

    const conversionRate = totals.won + totals.lost > 0
      ? Math.round((totals.won / (totals.won + totals.lost)) * 100)
      : 0;
    const avgDaysToWin = Math.round((avgWinRows[0]?.avgDays as number) || 0);
    const avgTicket = totals.won > 0 ? Math.round(values.won / totals.won) : 0;

    const byStage = byStageRows.map((r: any) => ({
      stageId: r.stageId as string,
      stageName: (r.stageName ?? '') as string,
      count: r.count as number,
      value: r.value as number,
    }));

    const byAgent = byAgentRows.map((r: any) => ({
      agentId: r.agentId as string,
      name: r.name as string,
      active: r.active as number,
      won: r.won as number,
      lost: r.lost as number,
      frozen: r.frozen as number,
      value: r.value as number,
    }));

    const topLossReasons = lossRows.map((r: any) => ({
      reason: r.reason as string,
      count: r.count as number,
    }));

    const leadsByDay: Record<string, number> = {};
    for (const r of leadsByDayRows) leadsByDay[r.day] = r.count as number;

    const revenueByOrigin = revenueByOriginRows.map((r: any) => ({
      origin: r.origin as string,
      count: r.count as number,
      value: r.value as number,
    }));

    const neglectedLeads = neglectedRows.map((r: any) => ({
      id: r.id as string,
      title: r.title as string | null,
      contactName: r.contactName as string | null,
      assignedTo: r.assignedTo as string,
      daysSinceUpdate: r.daysSinceUpdate as number,
    }));

    return {
      totals, values, conversionRate, avgDaysToWin, avgTicket,
      byStage, byAgent, topLossReasons, leadsByDay, revenueByOrigin, neglectedLeads,
    };
  }
}
