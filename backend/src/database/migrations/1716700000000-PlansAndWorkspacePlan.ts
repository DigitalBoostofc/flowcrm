import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlansAndWorkspacePlan1716700000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "plans" (
        "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
        "slug"              VARCHAR(40) NOT NULL,
        "name"              VARCHAR(80) NOT NULL,
        "description"       TEXT NOT NULL DEFAULT '',
        "priceMonthlyCents" INT NOT NULL DEFAULT 0,
        "features"          JSONB NOT NULL DEFAULT '[]'::jsonb,
        "highlight"         BOOLEAN NOT NULL DEFAULT false,
        "active"            BOOLEAN NOT NULL DEFAULT true,
        "sortOrder"         INT NOT NULL DEFAULT 0,
        "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plans" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_plans_slug" UNIQUE ("slug")
      )
    `);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_plans_slug" ON "plans" ("slug")`);

    await runner.query(`
      ALTER TABLE "workspaces"
      ADD COLUMN IF NOT EXISTS "planSlug" VARCHAR(40)
    `);

    // Seed inicial
    await runner.query(`
      INSERT INTO "plans" ("slug","name","description","priceMonthlyCents","features","highlight","active","sortOrder")
      VALUES
        ('pro','Pro','Ideal para começar a organizar seu comercial.',19700,
          '[]'::jsonb, false, true, 1),
        ('performance','Performance','Tudo liberado. Acelera o time com Inbox, Automações e Templates.',39700,
          '["inbox","automations","automation_templates"]'::jsonb, true, true, 2)
      ON CONFLICT ("slug") DO NOTHING
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "planSlug"`);
    await runner.query(`DROP TABLE IF EXISTS "plans"`);
  }
}
