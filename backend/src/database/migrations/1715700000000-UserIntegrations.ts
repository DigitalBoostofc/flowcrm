import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserIntegrations1715700000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "user_integrations" (
        "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
        "userId"       UUID NOT NULL,
        "provider"     VARCHAR(50) NOT NULL,
        "accessToken"  TEXT NOT NULL,
        "refreshToken" TEXT,
        "expiresAt"    TIMESTAMPTZ,
        "accountEmail" TEXT,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_integrations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_integrations_user_provider" UNIQUE ("userId", "provider")
      )
    `);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_integrations_userId" ON "user_integrations" ("userId")`);

    await runner.query(`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "googleEventIds" JSONB NOT NULL DEFAULT '{}'`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "tasks" DROP COLUMN IF EXISTS "googleEventIds"`);
    await runner.query(`DROP TABLE IF EXISTS "user_integrations"`);
  }
}
