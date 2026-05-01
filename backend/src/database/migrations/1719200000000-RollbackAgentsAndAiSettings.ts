import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rollback do Sprint 4 (Agentes IA): remove tabelas `agents` e
 * `workspace_ai_settings` e o plano `ai_enterprise` criados pelas
 * migrations 1719100000000 e 1719100100000 (revertidas via PR de
 * rollback para a PR 55).
 *
 * Idempotente — usa IF EXISTS pra rodar mesmo onde nada foi aplicado.
 * down() é noop: não recriamos schema descartado.
 */
export class RollbackAgentsAndAiSettings1719200000000 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP INDEX IF EXISTS idx_agents_workspace_active`);
    await runner.query(`DROP TABLE IF EXISTS "agents"`);
    await runner.query(`DROP TABLE IF EXISTS "workspace_ai_settings"`);
    await runner.query(
      `UPDATE "workspaces" SET "planSlug" = 'performance' WHERE "planSlug" = 'ai_enterprise'`,
    );
    await runner.query(`DELETE FROM "plans" WHERE "slug" = 'ai_enterprise'`);
  }

  public async down(): Promise<void> {
    // Sem rollback: o schema removido foi descartado intencionalmente.
  }
}
