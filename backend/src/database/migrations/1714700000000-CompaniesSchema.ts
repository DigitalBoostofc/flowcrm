import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompaniesSchema1714700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "companies_privacy_enum" AS ENUM ('all','restricted');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "companies" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "cnpj" varchar,
        "razaoSocial" varchar,
        "categoria" varchar,
        "origem" varchar,
        "setor" varchar,
        "descricao" text,
        "responsibleId" uuid,
        "privacy" "companies_privacy_enum" NOT NULL DEFAULT 'all',
        "additionalAccessUserIds" jsonb NOT NULL DEFAULT '[]',
        "email" varchar,
        "whatsapp" varchar,
        "telefone" varchar,
        "celular" varchar,
        "fax" varchar,
        "ramal" varchar,
        "website" varchar,
        "cep" varchar,
        "pais" varchar DEFAULT 'Brasil',
        "estado" varchar,
        "cidade" varchar,
        "bairro" varchar,
        "rua" varchar,
        "numero" varchar,
        "complemento" varchar,
        "produtos" jsonb NOT NULL DEFAULT '[]',
        "pessoaIds" jsonb NOT NULL DEFAULT '[]',
        "facebook" varchar,
        "twitter" varchar,
        "linkedin" varchar,
        "skype" varchar,
        "instagram" varchar,
        "ranking" int,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_companies_name" ON "companies" ("name")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_companies_cnpj" ON "companies" ("cnpj")`);

    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD CONSTRAINT "FK_companies_responsible"
      FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "companies"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "companies_privacy_enum"`);
  }
}
