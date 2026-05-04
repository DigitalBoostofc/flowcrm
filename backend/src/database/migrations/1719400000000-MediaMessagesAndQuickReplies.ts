import { MigrationInterface, QueryRunner } from 'typeorm';

export class MediaMessagesAndQuickReplies1719400000000 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    // Extend messages table for media support
    await runner.query(`ALTER TABLE "messages" ALTER COLUMN "type" TYPE varchar(20)`);
    await runner.query(`ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "mediaUrl" text NULL`);
    await runner.query(`ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "mediaMimeType" varchar(100) NULL`);
    await runner.query(`ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "mediaCaption" text NULL`);
    await runner.query(`ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "mediaFileName" varchar(255) NULL`);
    await runner.query(`ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "reaction" varchar(10) NULL`);
    await runner.query(`ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz NULL`);

    // Quick replies table
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "quick_replies" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "title" varchar(100) NOT NULL,
        "shortcut" varchar(50) NULL,
        "body" text NOT NULL,
        "category" varchar(50) NULL,
        "createdById" uuid NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await runner.query(
      `CREATE INDEX IF NOT EXISTS idx_quick_replies_workspace ON "quick_replies" ("workspaceId")`,
    );
    await runner.query(
      `CREATE INDEX IF NOT EXISTS idx_quick_replies_shortcut ON "quick_replies" ("workspaceId", "shortcut")`,
    );
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP INDEX IF EXISTS idx_quick_replies_shortcut`);
    await runner.query(`DROP INDEX IF EXISTS idx_quick_replies_workspace`);
    await runner.query(`DROP TABLE IF EXISTS "quick_replies"`);

    await runner.query(`ALTER TABLE "messages" DROP COLUMN IF EXISTS "deletedAt"`);
    await runner.query(`ALTER TABLE "messages" DROP COLUMN IF EXISTS "reaction"`);
    await runner.query(`ALTER TABLE "messages" DROP COLUMN IF EXISTS "mediaFileName"`);
    await runner.query(`ALTER TABLE "messages" DROP COLUMN IF EXISTS "mediaCaption"`);
    await runner.query(`ALTER TABLE "messages" DROP COLUMN IF EXISTS "mediaMimeType"`);
    await runner.query(`ALTER TABLE "messages" DROP COLUMN IF EXISTS "mediaUrl"`);
    await runner.query(`ALTER TABLE "messages" ALTER COLUMN "type" TYPE varchar(10)`);
  }
}
