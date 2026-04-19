import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadPessoaExtras1714800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "leads_privacy_enum" AS ENUM ('all','restricted');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "leads"
        ADD COLUMN IF NOT EXISTS "privacy" "leads_privacy_enum" NOT NULL DEFAULT 'all',
        ADD COLUMN IF NOT EXISTS "additionalAccessUserIds" jsonb NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "items" jsonb NOT NULL DEFAULT '[]'
    `);

    await queryRunner.query(`
      ALTER TABLE "contacts"
        ADD COLUMN IF NOT EXISTS "categoria" varchar,
        ADD COLUMN IF NOT EXISTS "responsibleId" uuid
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contacts"
        ADD CONSTRAINT "FK_contacts_responsible"
        FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "privacy"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "additionalAccessUserIds"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "items"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "FK_contacts_responsible"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "categoria"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "responsibleId"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "leads_privacy_enum"`);
  }
}
