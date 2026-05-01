import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cria a base do Sprint 4 (Agentes IA WhatsApp):
 *  - workspace_ai_settings: 1 por workspace, guarda key BYO ou platform + cota mensal
 *  - agents: agentes IA configuráveis com fluxo de atendimento, persona e tools
 *
 * Não habilita execução de agente nesta migration — apenas estrutura.
 */
export class CreateAgentsAndAiSettings1719100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace_ai_settings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL UNIQUE,
        "provider" varchar(20) NOT NULL DEFAULT 'anthropic',
        "keySource" varchar(20) NOT NULL DEFAULT 'platform',
        "apiKeyEncrypted" text NULL,
        "apiKeyLast4" varchar(8) NULL,
        "defaultModel" varchar(60) NOT NULL DEFAULT 'claude-haiku-4-5',
        "monthlyTokenBudget" integer NULL,
        "tokensUsedThisMonth" integer NOT NULL DEFAULT 0,
        "lastValidatedAt" timestamptz NULL,
        "enabled" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "name" varchar(80) NOT NULL,
        "persona" varchar(20) NOT NULL DEFAULT 'proxima',
        "model" varchar(60) NOT NULL DEFAULT 'claude-haiku-4-5',
        "systemPrompt" text NOT NULL DEFAULT '',
        "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "active" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_agents_workspace_active ON agents ("workspaceId", "active") WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_agents_workspace_active`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_ai_settings"`);
  }
}
