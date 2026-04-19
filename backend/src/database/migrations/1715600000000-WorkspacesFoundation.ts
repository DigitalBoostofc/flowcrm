import { MigrationInterface, QueryRunner } from 'typeorm';

const TENANT_TABLES = [
  'users',
  'pipelines',
  'stages',
  'contacts',
  'leads',
  'companies',
  'channel_configs',
  'message_templates',
  'conversations',
  'messages',
  'scheduled_messages',
  'lead_activities',
  'tasks',
  'loss_reasons',
  'customer_origins',
  'customer_categories',
  'sectors',
  'stage_required_fields',
  'automations',
  'automation_executions',
];

export class WorkspacesFoundation1715600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workspaces" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "ownerUserId" uuid,
        "trialStartedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "trialEndsAt" TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
        "subscriptionStatus" varchar(20) NOT NULL DEFAULT 'trial',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspaces" PRIMARY KEY ("id")
      )
    `);

    const existingDataCheck = await queryRunner.query(`SELECT COUNT(*) FROM users`);
    const hasExistingData = Number(existingDataCheck[0]?.count ?? 0) > 0;

    let defaultId: string;
    if (hasExistingData) {
      const inserted = await queryRunner.query(`
        INSERT INTO "workspaces" ("name", "trialStartedAt", "trialEndsAt", "subscriptionStatus")
        VALUES ('Default', now(), now() + INTERVAL '100 years', 'active')
        RETURNING id
      `);
      defaultId = inserted[0].id;
    } else {
      defaultId = '';
    }

    for (const table of TENANT_TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "workspaceId" uuid`);
      if (hasExistingData) {
        await queryRunner.query(
          `UPDATE "${table}" SET "workspaceId" = $1 WHERE "workspaceId" IS NULL`,
          [defaultId],
        );
      }
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "workspaceId" SET NOT NULL`);
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_workspace"
         FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_${table}_workspace" ON "${table}" ("workspaceId")`,
      );
    }

    if (hasExistingData) {
      const firstOwner = await queryRunner.query(
        `SELECT id FROM users WHERE role = 'owner' ORDER BY "createdAt" ASC LIMIT 1`,
      );
      if (firstOwner[0]?.id) {
        await queryRunner.query(
          `UPDATE "workspaces" SET "ownerUserId" = $1 WHERE id = $2`,
          [firstOwner[0].id, defaultId],
        );
      }
    }

    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD CONSTRAINT "FK_workspaces_owner"
      FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_email"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_workspace_email" ON "users" ("workspaceId", lower("email"))`,
    );

    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(30)`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneVerified" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(`ALTER TABLE "loss_reasons" DROP CONSTRAINT IF EXISTS "loss_reasons_label_key"`);
    await queryRunner.query(
      `ALTER TABLE "loss_reasons" ADD CONSTRAINT "UQ_loss_reasons_workspace_label" UNIQUE ("workspaceId", "label")`,
    );
    await queryRunner.query(`ALTER TABLE "customer_origins" DROP CONSTRAINT IF EXISTS "customer_origins_name_key"`);
    await queryRunner.query(
      `ALTER TABLE "customer_origins" ADD CONSTRAINT "UQ_customer_origins_workspace_name" UNIQUE ("workspaceId", "name")`,
    );
    await queryRunner.query(`ALTER TABLE "customer_categories" DROP CONSTRAINT IF EXISTS "customer_categories_name_key"`);
    await queryRunner.query(
      `ALTER TABLE "customer_categories" ADD CONSTRAINT "UQ_customer_categories_workspace_name" UNIQUE ("workspaceId", "name")`,
    );
    await queryRunner.query(`ALTER TABLE "sectors" DROP CONSTRAINT IF EXISTS "sectors_name_key"`);
    await queryRunner.query(
      `ALTER TABLE "sectors" ADD CONSTRAINT "UQ_sectors_workspace_name" UNIQUE ("workspaceId", "name")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sectors" DROP CONSTRAINT IF EXISTS "UQ_sectors_workspace_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_categories" DROP CONSTRAINT IF EXISTS "UQ_customer_categories_workspace_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_origins" DROP CONSTRAINT IF EXISTS "UQ_customer_origins_workspace_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loss_reasons" DROP CONSTRAINT IF EXISTS "UQ_loss_reasons_workspace_label"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phoneVerified"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_workspace_email"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_email" ON "users" (lower("email"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP CONSTRAINT IF EXISTS "FK_workspaces_owner"`,
    );

    for (const table of TENANT_TABLES) {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${table}_workspace"`);
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "FK_${table}_workspace"`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "workspaceId"`);
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "workspaces"`);
  }
}
