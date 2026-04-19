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

      // Leads primeiro: cascade elimina conversations → messages/scheduled_messages,
      // lead_activities e automation_executions (todos têm leadId ON DELETE CASCADE).
      // Isso também resolve leads.contactId → contacts (NO ACTION) e
      // leads.stageId/pipelineId → stages/pipelines (NO ACTION).
      await em.query(`DELETE FROM leads WHERE "workspaceId" = $1`, [wid]);

      // Contacts e companies agora são seguros (nenhum lead os referencia mais).
      await em.query(`DELETE FROM contacts WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM companies WHERE "workspaceId" = $1`, [wid]);

      // message_templates: createdById → users (NO ACTION).
      // Deve ser deletado antes dos users (que serão cascade deletados pelo workspace).
      await em.query(`DELETE FROM message_templates WHERE "workspaceId" = $1`, [wid]);

      // Tabelas sem FK para workspaces — precisam de subquery ou workspaceId direto.
      await em.query(`DELETE FROM feature_flags WHERE "workspaceId" = $1`, [wid]);
      await em.query(`DELETE FROM otp_verifications WHERE phone IN (
                         SELECT phone FROM users WHERE "workspaceId" = $1 AND phone IS NOT NULL
                       )`, [wid]);
      await em.query(`DELETE FROM user_integrations WHERE "userId" IN (
                         SELECT id FROM users WHERE "workspaceId" = $1
                       )`, [wid]);

      // Quebrar FK circular workspaces.ownerUserId → users.id antes de deletar users.
      await em.query(`UPDATE workspaces SET "ownerUserId" = NULL WHERE id = $1`, [wid]);

      // Deletar o workspace: ON DELETE CASCADE cuida de tudo que sobrou
      // (users, pipelines → stages → automations → steps, channel_configs,
      //  tasks, loss_reasons, customer_origins, customer_categories, sectors,
      //  stage_required_fields, automation_executions, etc.).
      await em.query(`DELETE FROM workspaces WHERE id = $1`, [wid]);
    });

    this.logger.warn(`DELEÇÃO PERMANENTE concluída para workspace ${workspaceId}`);
  }
}
