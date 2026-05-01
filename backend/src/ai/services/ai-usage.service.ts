import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceAiUsage } from '../entities/workspace-ai-usage.entity';
import { TenantContext } from '../../common/tenant/tenant-context.service';

/**
 * Contabiliza tokens consumidos por workspace/mês e bloqueia chamada
 * quando o budget mensal estoura.
 *
 * Mês = 'YYYY-MM' em UTC. Linha criada lazy na primeira chamada do mês.
 */
@Injectable()
export class AiUsageService {
  constructor(
    @InjectRepository(WorkspaceAiUsage) private readonly repo: Repository<WorkspaceAiUsage>,
    private readonly tenant: TenantContext,
    private readonly config: ConfigService,
  ) {}

  /**
   * Garante que o workspace ainda tem budget disponível pro mês corrente.
   * Throws ForbiddenException se estourou. Não consome tokens — só checa.
   */
  async assertBudgetAvailable(): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const month = AiUsageService.currentMonth();
    const row = await this.repo.findOne({ where: { workspaceId, month } });
    if (!row) return;
    const budget = row.monthlyBudgetTokens ?? this.defaultBudget();
    if (budget > 0 && row.tokensUsed >= budget) {
      throw new ForbiddenException({
        message: 'Limite mensal de tokens da IA atingido para este workspace.',
        code: 'ai_budget_exceeded',
        used: row.tokensUsed,
        budget,
      });
    }
  }

  /**
   * Soma tokens ao mês corrente. Cria a linha do mês se ainda não existir.
   * Usa UPSERT pra evitar race entre múltiplas chamadas concorrentes.
   */
  async recordUsage(tokens: number): Promise<void> {
    if (tokens <= 0) return;
    const workspaceId = this.tenant.requireWorkspaceId();
    const month = AiUsageService.currentMonth();
    await this.repo.query(
      `
      INSERT INTO "workspace_ai_usage" ("workspaceId", "month", "tokensUsed")
      VALUES ($1, $2, $3)
      ON CONFLICT ("workspaceId", "month")
      DO UPDATE SET "tokensUsed" = "workspace_ai_usage"."tokensUsed" + EXCLUDED."tokensUsed",
                    "updatedAt" = now()
      `,
      [workspaceId, month, tokens],
    );
  }

  static currentMonth(now: Date = new Date()): string {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private defaultBudget(): number {
    return this.config.get<number>('AI_DEFAULT_MONTHLY_BUDGET_TOKENS') ?? 1_000_000;
  }
}
