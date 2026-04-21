import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTrialPlan1717200000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const existing: Array<{ id: string }> = await runner.query(
      `SELECT id FROM "plans" WHERE slug = 'trial'`,
    );
    if (existing.length > 0) return;

    const allFeatures = ['inbox', 'analytics', 'tasks', 'automations', 'automation_templates', 'whatsapp_channels'];

    await runner.query(
      `INSERT INTO "plans" (slug, name, description, "priceMonthlyCents", features, highlight, active, "sortOrder")
       VALUES ('trial', 'Trial', 'Período de avaliação — libera todas as funcionalidades por padrão.', 0, $1::jsonb, false, true, -1)`,
      [JSON.stringify(allFeatures)],
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DELETE FROM "plans" WHERE slug = 'trial'`);
  }
}
