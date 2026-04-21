import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPreferences1716900000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "user_preferences" (
        "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
        "userId"    UUID NOT NULL,
        "key"       VARCHAR(120) NOT NULL,
        "value"     JSONB NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_prefs_user_key" UNIQUE ("userId","key")
      )
    `);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_prefs_user" ON "user_preferences" ("userId")`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS "user_preferences"`);
  }
}
