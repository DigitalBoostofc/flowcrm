import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContactExtraFields1714500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contacts"
        ADD COLUMN IF NOT EXISTS "company"  character varying,
        ADD COLUMN IF NOT EXISTS "role"     character varying,
        ADD COLUMN IF NOT EXISTS "website"  character varying,
        ADD COLUMN IF NOT EXISTS "zipCode"  character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "leads"
        ADD COLUMN IF NOT EXISTS "notes" text
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "company"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "role"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "website"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "zipCode"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "notes"`);
  }
}
