import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cria/atualiza o plano "AI Enterprise" e adiciona a feature `ai_agents`
 * apenas a esse plano (não vai pro Pro nem pro Performance).
 *
 * Idempotente — re-runs apenas garantem o estado.
 */
export class SeedAiEnterprisePlan1719100100000 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      INSERT INTO "plans" ("slug","name","description","priceMonthlyCents","features","highlight","active","sortOrder")
      VALUES (
        'ai_enterprise',
        'AI Enterprise',
        'Plano com Agentes IA: SDR autônomo no WhatsApp, qualificação B2B/B2C, classificação de interesse e movimentação automática no funil.',
        99700,
        '["inbox","automations","automation_templates","whatsapp_channels","analytics","tasks","ai_agents"]'::jsonb,
        true,
        true,
        3
      )
      ON CONFLICT ("slug") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "priceMonthlyCents" = EXCLUDED."priceMonthlyCents",
        "features" = EXCLUDED."features",
        "highlight" = EXCLUDED."highlight",
        "sortOrder" = EXCLUDED."sortOrder";
    `);
  }

  public async down(runner: QueryRunner): Promise<void> {
    // Remove apenas a feature ai_agents — preserva o plano se já existia antes.
    await runner.query(`
      UPDATE "plans"
      SET "features" = (
        SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
        FROM jsonb_array_elements_text("features") value
        WHERE value <> 'ai_agents'
      )
      WHERE "features" ? 'ai_agents';
    `);
  }
}
