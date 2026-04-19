import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformAdmin1715900000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "platform_audit_logs" (
        "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
        "actorEmail"          VARCHAR(320) NOT NULL,
        "actorUserId"         UUID,
        "action"              VARCHAR(60) NOT NULL,
        "targetWorkspaceId"   UUID,
        "targetUserId"        UUID,
        "metadata"            JSONB NOT NULL DEFAULT '{}',
        "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_actor" ON "platform_audit_logs" ("actorEmail")`);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_action" ON "platform_audit_logs" ("action")`);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_target_ws" ON "platform_audit_logs" ("targetWorkspaceId")`);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_createdAt" ON "platform_audit_logs" ("createdAt")`);

    await runner.query(`
      CREATE TABLE IF NOT EXISTS "platform_broadcasts" (
        "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
        "title"           VARCHAR(120) NOT NULL,
        "body"            TEXT NOT NULL,
        "severity"        VARCHAR(20) NOT NULL DEFAULT 'info',
        "active"          BOOLEAN NOT NULL DEFAULT true,
        "startsAt"        TIMESTAMPTZ,
        "endsAt"          TIMESTAMPTZ,
        "createdByEmail"  VARCHAR(320) NOT NULL,
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_broadcasts" PRIMARY KEY ("id")
      )
    `);

    await runner.query(`
      CREATE TABLE IF NOT EXISTS "feature_flags" (
        "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
        "key"          VARCHAR(80) NOT NULL,
        "workspaceId"  UUID,
        "enabled"      BOOLEAN NOT NULL DEFAULT false,
        "metadata"     JSONB NOT NULL DEFAULT '{}',
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_feature_flags" PRIMARY KEY ("id")
      )
    `);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_flag_key" ON "feature_flags" ("key")`);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_flag_ws" ON "feature_flags" ("workspaceId")`);
    await runner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_flag_key_ws"
      ON "feature_flags" ("key", COALESCE("workspaceId", '00000000-0000-0000-0000-000000000000'::uuid))
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS "feature_flags"`);
    await runner.query(`DROP TABLE IF EXISTS "platform_broadcasts"`);
    await runner.query(`DROP TABLE IF EXISTS "platform_audit_logs"`);
  }
}
