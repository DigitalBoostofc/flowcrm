import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadExternalContact1716100000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "externalName" VARCHAR`);
    await runner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "externalPhone" VARCHAR`);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_externalPhone" ON "leads" ("externalPhone")`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP INDEX IF EXISTS "IDX_leads_externalPhone"`);
    await runner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "externalPhone"`);
    await runner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "externalName"`);
  }
}
