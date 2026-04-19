import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadNegocioExtras1715000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "leads"
        ADD COLUMN IF NOT EXISTS "createdById" uuid,
        ADD COLUMN IF NOT EXISTS "ranking" int
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "leads"
        ADD CONSTRAINT "FK_leads_createdBy"
        FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "FK_leads_createdBy"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "createdById"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "ranking"`);
  }
}
