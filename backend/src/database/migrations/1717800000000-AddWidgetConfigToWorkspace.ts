import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWidgetConfigToWorkspace1717800000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE workspaces
      ADD COLUMN IF NOT EXISTS "widgetConfig" jsonb
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE workspaces DROP COLUMN IF EXISTS "widgetConfig"`);
  }
}
