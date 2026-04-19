import { MigrationInterface, QueryRunner } from 'typeorm';

export class PessoaExtras1714900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contacts_privacy_enum" AS ENUM ('all','restricted');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "contacts"
        ADD COLUMN IF NOT EXISTS "cpf" varchar,
        ADD COLUMN IF NOT EXISTS "birthDay" varchar,
        ADD COLUMN IF NOT EXISTS "birthYear" int,
        ADD COLUMN IF NOT EXISTS "origem" varchar,
        ADD COLUMN IF NOT EXISTS "descricao" text,
        ADD COLUMN IF NOT EXISTS "whatsapp" varchar,
        ADD COLUMN IF NOT EXISTS "celular" varchar,
        ADD COLUMN IF NOT EXISTS "fax" varchar,
        ADD COLUMN IF NOT EXISTS "ramal" varchar,
        ADD COLUMN IF NOT EXISTS "pais" varchar,
        ADD COLUMN IF NOT EXISTS "estado" varchar,
        ADD COLUMN IF NOT EXISTS "cidade" varchar,
        ADD COLUMN IF NOT EXISTS "bairro" varchar,
        ADD COLUMN IF NOT EXISTS "rua" varchar,
        ADD COLUMN IF NOT EXISTS "numero" varchar,
        ADD COLUMN IF NOT EXISTS "complemento" varchar,
        ADD COLUMN IF NOT EXISTS "produtos" jsonb NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "facebook" varchar,
        ADD COLUMN IF NOT EXISTS "twitter" varchar,
        ADD COLUMN IF NOT EXISTS "linkedin" varchar,
        ADD COLUMN IF NOT EXISTS "skype" varchar,
        ADD COLUMN IF NOT EXISTS "instagram" varchar,
        ADD COLUMN IF NOT EXISTS "privacy" "contacts_privacy_enum" NOT NULL DEFAULT 'all',
        ADD COLUMN IF NOT EXISTS "additionalAccessUserIds" jsonb NOT NULL DEFAULT '[]'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contacts"
        DROP COLUMN IF EXISTS "cpf",
        DROP COLUMN IF EXISTS "birthDay",
        DROP COLUMN IF EXISTS "birthYear",
        DROP COLUMN IF EXISTS "origem",
        DROP COLUMN IF EXISTS "descricao",
        DROP COLUMN IF EXISTS "whatsapp",
        DROP COLUMN IF EXISTS "celular",
        DROP COLUMN IF EXISTS "fax",
        DROP COLUMN IF EXISTS "ramal",
        DROP COLUMN IF EXISTS "pais",
        DROP COLUMN IF EXISTS "estado",
        DROP COLUMN IF EXISTS "cidade",
        DROP COLUMN IF EXISTS "bairro",
        DROP COLUMN IF EXISTS "rua",
        DROP COLUMN IF EXISTS "numero",
        DROP COLUMN IF EXISTS "complemento",
        DROP COLUMN IF EXISTS "produtos",
        DROP COLUMN IF EXISTS "facebook",
        DROP COLUMN IF EXISTS "twitter",
        DROP COLUMN IF EXISTS "linkedin",
        DROP COLUMN IF EXISTS "skype",
        DROP COLUMN IF EXISTS "instagram",
        DROP COLUMN IF EXISTS "privacy",
        DROP COLUMN IF EXISTS "additionalAccessUserIds"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "contacts_privacy_enum"`);
  }
}
