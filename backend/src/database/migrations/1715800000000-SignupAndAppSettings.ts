import { MigrationInterface, QueryRunner } from 'typeorm';

export class SignupAndAppSettings1715800000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "app_settings" (
        "id"                     VARCHAR(20) NOT NULL DEFAULT 'singleton',
        "systemChannelConfigId"  UUID,
        "signupEnabled"          BOOLEAN NOT NULL DEFAULT true,
        "trialDays"              INT NOT NULL DEFAULT 7,
        "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_settings" PRIMARY KEY ("id"),
        CONSTRAINT "CK_app_settings_singleton" CHECK ("id" = 'singleton')
      )
    `);
    await runner.query(`INSERT INTO "app_settings" ("id") VALUES ('singleton') ON CONFLICT DO NOTHING`);

    await runner.query(`
      CREATE TABLE IF NOT EXISTS "otp_verifications" (
        "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
        "phone"          VARCHAR(30) NOT NULL,
        "codeHash"       VARCHAR(255) NOT NULL,
        "purpose"        VARCHAR(30) NOT NULL,
        "payload"        JSONB NOT NULL DEFAULT '{}',
        "attempts"       INT NOT NULL DEFAULT 0,
        "expiresAt"      TIMESTAMPTZ NOT NULL,
        "consumedAt"     TIMESTAMPTZ,
        "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_verifications" PRIMARY KEY ("id")
      )
    `);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_otp_phone" ON "otp_verifications" ("phone")`);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_otp_expiresAt" ON "otp_verifications" ("expiresAt")`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS "otp_verifications"`);
    await runner.query(`DROP TABLE IF EXISTS "app_settings"`);
  }
}
