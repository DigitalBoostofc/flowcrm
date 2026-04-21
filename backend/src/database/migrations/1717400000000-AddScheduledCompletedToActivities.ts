import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduledCompletedToActivities1717400000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE lead_activities
        ADD COLUMN IF NOT EXISTS "scheduledAt" timestamp,
        ADD COLUMN IF NOT EXISTS "completedAt" timestamp,
        ADD COLUMN IF NOT EXISTS "updatedAt"   timestamp NOT NULL DEFAULT NOW();
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE lead_activities
        DROP COLUMN IF EXISTS "scheduledAt",
        DROP COLUMN IF EXISTS "completedAt",
        DROP COLUMN IF EXISTS "updatedAt";
    `);
  }
}
