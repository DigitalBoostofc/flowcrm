import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultLeadPrivacyToWorkspace1717600000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE workspaces
      ADD COLUMN IF NOT EXISTS "defaultLeadPrivacy" varchar(20) NOT NULL DEFAULT 'all'
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE workspaces DROP COLUMN IF EXISTS "defaultLeadPrivacy"`);
  }
}
