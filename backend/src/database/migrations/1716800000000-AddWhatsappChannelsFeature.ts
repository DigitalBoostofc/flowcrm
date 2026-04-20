import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhatsappChannelsFeature1716800000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    // Adiciona whatsapp_channels ao Performance se ainda não tiver
    await runner.query(`
      UPDATE "plans"
      SET "features" = (
        SELECT jsonb_agg(DISTINCT value)
        FROM jsonb_array_elements_text("features" || '["whatsapp_channels"]'::jsonb) value
      )
      WHERE "slug" = 'performance'
        AND NOT ("features" ? 'whatsapp_channels')
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      UPDATE "plans"
      SET "features" = (
        SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
        FROM jsonb_array_elements_text("features") value
        WHERE value <> 'whatsapp_channels'
      )
      WHERE "slug" = 'performance'
    `);
  }
}
