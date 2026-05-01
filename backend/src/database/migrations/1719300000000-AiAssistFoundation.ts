import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Foundation do módulo AI (assistente).
 *
 * - workspace_ai_usage: contabiliza tokens consumidos por workspace/mês,
 *   com teto opcional. Permite cortar uso quando estourar o budget.
 *
 * Sem provider/modelo aqui — escolha vive em env (OPENROUTER_API_KEY +
 * AI_MODEL_SUMMARY). BYO key e UI de configuração ficam para PR seguinte.
 */
export class AiAssistFoundation1719300000000 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "workspace_ai_usage" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "month" varchar(7) NOT NULL,
        "tokensUsed" integer NOT NULL DEFAULT 0,
        "monthlyBudgetTokens" integer NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await runner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_ai_usage_month
       ON "workspace_ai_usage" ("workspaceId", "month")`,
    );
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP INDEX IF EXISTS uq_workspace_ai_usage_month`);
    await runner.query(`DROP TABLE IF EXISTS "workspace_ai_usage"`);
  }
}
