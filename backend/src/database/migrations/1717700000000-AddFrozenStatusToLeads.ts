import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFrozenStatusToLeads1717700000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TYPE leads_status_enum ADD VALUE IF NOT EXISTS 'frozen'`);
    await runner.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS "freezeReason" text`);
    await runner.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS "frozenReturnDate" date`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE leads DROP COLUMN IF EXISTS "frozenReturnDate"`);
    await runner.query(`ALTER TABLE leads DROP COLUMN IF EXISTS "freezeReason"`);
  }
}
