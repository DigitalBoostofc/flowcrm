import { MigrationInterface, QueryRunner } from 'typeorm';

export class StripeBilling1717200000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE "workspaces"
        ADD COLUMN IF NOT EXISTS "stripeCustomerId" varchar(120),
        ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" varchar(120),
        ADD COLUMN IF NOT EXISTS "currentPeriodEnd" timestamptz,
        ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false
    `);
    await runner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_workspaces_stripeCustomerId" ON "workspaces" ("stripeCustomerId") WHERE "stripeCustomerId" IS NOT NULL`,
    );
    await runner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_workspaces_stripeSubscriptionId" ON "workspaces" ("stripeSubscriptionId") WHERE "stripeSubscriptionId" IS NOT NULL`,
    );

    await runner.query(`
      ALTER TABLE "plans"
        ADD COLUMN IF NOT EXISTS "stripePriceId" varchar(120),
        ADD COLUMN IF NOT EXISTS "stripeProductId" varchar(120)
    `);

    await runner.query(`
      CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
        "id" varchar(120) PRIMARY KEY,
        "type" varchar(120) NOT NULL,
        "receivedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS "stripe_webhook_events"`);
    await runner.query(`DROP INDEX IF EXISTS "IDX_workspaces_stripeSubscriptionId"`);
    await runner.query(`DROP INDEX IF EXISTS "IDX_workspaces_stripeCustomerId"`);
    await runner.query(`
      ALTER TABLE "plans"
        DROP COLUMN IF EXISTS "stripePriceId",
        DROP COLUMN IF EXISTS "stripeProductId"
    `);
    await runner.query(`
      ALTER TABLE "workspaces"
        DROP COLUMN IF EXISTS "stripeCustomerId",
        DROP COLUMN IF EXISTS "stripeSubscriptionId",
        DROP COLUMN IF EXISTS "currentPeriodEnd",
        DROP COLUMN IF EXISTS "cancelAtPeriodEnd"
    `);
  }
}
