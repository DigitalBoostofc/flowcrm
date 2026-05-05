import { MigrationInterface, QueryRunner } from 'typeorm';

export class InboxTags1746500000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS inbox_tags (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspaceId" UUID NOT NULL,
        name         VARCHAR(100) NOT NULL,
        color        VARCHAR(20) NOT NULL DEFAULT '#6366f1',
        position     INT NOT NULL DEFAULT 0,
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await qr.query(`CREATE INDEX IF NOT EXISTS idx_inbox_tags_workspace ON inbox_tags ("workspaceId")`);

    await qr.query(`
      ALTER TABLE conversations
        ADD COLUMN IF NOT EXISTS "inboxTagId" UUID REFERENCES inbox_tags(id) ON DELETE SET NULL
    `);

    await qr.query(`CREATE INDEX IF NOT EXISTS idx_conversations_inbox_tag ON conversations ("inboxTagId")`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE conversations DROP COLUMN IF EXISTS "inboxTagId"`);
    await qr.query(`DROP TABLE IF EXISTS inbox_tags`);
  }
}
