import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Workspace } from './entities/workspace.entity';

export interface WorkspaceWithTrial extends Workspace {
  trialDaysLeft: number;
  isBlocked: boolean;
}

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    @InjectRepository(Workspace) private repo: Repository<Workspace>,
    private dataSource: DataSource,
  ) {}

  async findOne(id: string): Promise<Workspace> {
    const w = await this.repo.findOne({ where: { id } });
    if (!w) throw new NotFoundException('Workspace não encontrado');
    return w;
  }

  async findOneWithTrial(id: string): Promise<WorkspaceWithTrial> {
    let w = await this.findOne(id);
    const now = Date.now();
    const endMs = new Date(w.trialEndsAt).getTime();
    if (w.subscriptionStatus === 'trial' && endMs < now) {
      await this.repo.update(id, { subscriptionStatus: 'expired' });
      w = await this.findOne(id);
    }
    const trialDaysLeft =
      w.subscriptionStatus === 'trial'
        ? Math.max(0, Math.ceil((endMs - now) / 86_400_000))
        : 0;
    const isBlocked = w.subscriptionStatus === 'expired' || w.subscriptionStatus === 'canceled';
    return Object.assign(w, { trialDaysLeft, isBlocked });
  }

  async create(data: {
    name: string;
    ownerUserId?: string | null;
    trialDays?: number;
  }): Promise<Workspace> {
    const days = data.trialDays ?? 7;
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(trialStartedAt.getTime() + days * 24 * 60 * 60 * 1000);
    const w = this.repo.create({
      name: data.name,
      ownerUserId: data.ownerUserId ?? null,
      trialStartedAt,
      trialEndsAt,
      subscriptionStatus: 'trial',
    });
    return this.repo.save(w);
  }

  async updateOwner(id: string, ownerUserId: string): Promise<void> {
    await this.repo.update(id, { ownerUserId });
  }

  async updateSubscription(
    id: string,
    status: Workspace['subscriptionStatus'],
  ): Promise<Workspace> {
    await this.repo.update(id, { subscriptionStatus: status });
    return this.findOne(id);
  }

  /**
   * Deleta permanentemente o workspace e TODOS os dados associados.
   * Operação irreversível — executada em transação.
   */
  async deleteWorkspaceAndAllData(workspaceId: string): Promise<void> {
    this.logger.warn(`DELEÇÃO PERMANENTE iniciada para workspace ${workspaceId}`);

    await this.dataSource.transaction(async (em) => {
      const wid = workspaceId;

      // Ordem respeita FK: primeiro filhos, depois pais
      await em.query(`DELETE FROM messages             WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM conversations         WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM automation_executions WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM scheduled_messages    WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM lead_activities       WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM tasks                 WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM leads                 WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM contacts              WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM companies             WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM automation_steps
                       WHERE "automationId" IN (SELECT id FROM automations WHERE "workspaceId" = $1)`, [wid]);
      await em.query(`DELETE FROM automations           WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM message_templates     WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM channel_configs       WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM stage_required_fields
                       WHERE "stageId" IN (SELECT id FROM stages WHERE "workspaceId" = $1)`, [wid]);
      await em.query(`DELETE FROM stages                WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM pipelines             WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM loss_reasons          WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM customer_origins      WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM customer_categories   WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM sectors               WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM feature_flags          WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM otp_verifications     WHERE phone IN (
                         SELECT phone FROM users WHERE "workspaceId" = $1 AND phone IS NOT NULL
                       )`, [wid]);
      await em.query(`DELETE FROM user_integrations     WHERE "userId" IN (
                         SELECT id FROM users WHERE "workspaceId" = $1
                       )`, [wid]);

      // Nulifica owner antes de deletar users (evita FK violation)
      await em.query(`UPDATE workspaces SET "ownerUserId" = NULL WHERE id = $1`, [wid]);
      await em.query(`DELETE FROM users                 WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM workspaces            WHERE id = $1`, [wid]);
    });

    this.logger.warn(`DELEÇÃO PERMANENTE concluída para workspace ${workspaceId}`);
  }
}
