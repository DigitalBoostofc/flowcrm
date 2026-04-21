import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Lead, LeadStatus } from '../leads/entities/lead.entity';
import { User } from '../users/entities/user.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Workspace) private workspaces: Repository<Workspace>,
    private mail: MailService,
  ) {}

  @Cron('0 8 * * 1') // Every Monday at 8am
  async sendWeeklySummaries() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    await this.sendSummaries(start, end, 'weekly');
  }

  @Cron('0 8 1 * *') // 1st of every month at 8am
  async sendMonthlySummaries() {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    const startOfThisMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    await this.sendSummaries(start, startOfThisMonth, 'monthly');
  }

  private async sendSummaries(start: Date, end: Date, type: 'weekly' | 'monthly') {
    const workspaces = await this.workspaces.find();

    for (const ws of workspaces) {
      try {
        await this.sendForWorkspace(ws, start, end, type);
      } catch (err) {
        this.logger.error(`Failed to send ${type} summary for workspace ${ws.id}`, err);
      }
    }
  }

  private async sendForWorkspace(ws: Workspace, start: Date, end: Date, type: 'weekly' | 'monthly') {
    const leads = await this.leads.find({
      where: { workspaceId: ws.id },
      relations: ['assignedTo'],
    });

    const period = leads.filter((l) => new Date(l.createdAt) >= start && new Date(l.createdAt) < end);
    const won = leads.filter((l) => l.status === LeadStatus.WON && new Date(l.updatedAt) >= start && new Date(l.updatedAt) < end);
    const lost = leads.filter((l) => l.status === LeadStatus.LOST && new Date(l.updatedAt) >= start && new Date(l.updatedAt) < end);
    const active = leads.filter((l) => l.status === LeadStatus.ACTIVE && !l.archivedAt);

    const wonValue = won.reduce((s, l) => s + Number(l.value ?? 0), 0);
    const pipeline = active.reduce((s, l) => s + Number(l.value ?? 0), 0);
    const conversionRate = won.length + lost.length > 0
      ? Math.round((won.length / (won.length + lost.length)) * 100)
      : 0;

    const label = type === 'weekly' ? 'Semana' : 'Mês';
    const periodLabel = type === 'weekly'
      ? `${start.toLocaleDateString('pt-BR')} – ${end.toLocaleDateString('pt-BR')}`
      : start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const html = buildEmailHtml({
      wsName: ws.name,
      label,
      periodLabel,
      newLeads: period.length,
      wonCount: won.length,
      lostCount: lost.length,
      wonValue,
      pipeline,
      conversionRate,
      activeTotal: active.length,
    });

    const owners = await this.users.find({ where: { workspaceId: ws.id, role: 'owner' as any } });
    for (const owner of owners) {
      if (!owner.email) continue;
      const subject = `Sumário ${label.toLowerCase()} FlowCRM — ${periodLabel}`;
      await this.mail.send(owner.email, subject, html);
      this.logger.log(`Sent ${type} summary to ${owner.email} (ws: ${ws.id})`);
    }
  }
}

function buildEmailHtml(data: {
  wsName: string; label: string; periodLabel: string;
  newLeads: number; wonCount: number; lostCount: number;
  wonValue: number; pipeline: number; conversionRate: number; activeTotal: number;
}): string {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">FlowCRM</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Sumário ${data.label} · ${data.periodLabel}</p>
      </div>
      <!-- Body -->
      <div style="padding:28px;">
        <p style="margin:0 0 20px;font-size:15px;color:#374151;">Olá! Aqui está o resumo de <strong>${data.label.toLowerCase()}</strong> de <strong>${data.wsName}</strong>.</p>
        <!-- KPI grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
          ${kpiCard('Novos negócios', String(data.newLeads), '#6366f1')}
          ${kpiCard('Ganhos', String(data.wonCount), '#10b981')}
          ${kpiCard('Perdidos', String(data.lostCount), '#ef4444')}
          ${kpiCard('Taxa de conv.', `${data.conversionRate}%`, '#f59e0b')}
          ${kpiCard('Receita ganha', fmt(data.wonValue), '#10b981')}
          ${kpiCard('Pipeline ativo', fmt(data.pipeline), '#6366f1')}
        </div>
        <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">Total de negócios ativos: ${data.activeTotal}</p>
      </div>
      <!-- Footer -->
      <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">FlowCRM · Você está recebendo este e-mail pois é dono do workspace.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function kpiCard(label: string, value: string, color: string): string {
  return `<div style="background:#f9fafb;border-radius:10px;padding:16px;text-align:center;">
    <div style="font-size:20px;font-weight:700;color:${color};">${value}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:4px;">${label}</div>
  </div>`;
}
