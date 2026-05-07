import { MigrationInterface, QueryRunner } from 'typeorm';

export class GlobalLabels1746800000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE labels ADD COLUMN IF NOT EXISTS "position" INT NOT NULL DEFAULT 0`);

    await qr.query(`UPDATE labels SET "pipelineId" = NULL WHERE "pipelineId" IS NOT NULL`);

    await qr.query(`
      INSERT INTO labels (id, "workspaceId", name, color, "position", "createdAt", "updatedAt")
      SELECT id, "workspaceId", name, color, "position", "createdAt", "updatedAt"
      FROM inbox_tags
      ON CONFLICT DO NOTHING
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS conversation_labels (
        "conversationId" UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        "labelId"        UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
        PRIMARY KEY ("conversationId", "labelId")
      )
    `);

    await qr.query(`
      INSERT INTO conversation_labels ("conversationId", "labelId")
      SELECT id, "inboxTagId"
      FROM conversations
      WHERE "inboxTagId" IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    await qr.query(`ALTER TABLE conversations DROP COLUMN IF EXISTS "inboxTagId"`);

    await qr.query(`DROP TABLE IF EXISTS inbox_tags`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS inbox_tags (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspaceId" UUID NOT NULL,
        name          VARCHAR(100) NOT NULL,
        color         VARCHAR(20) NOT NULL DEFAULT '#6366f1',
        position      INT NOT NULL DEFAULT 0,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await qr.query(`CREATE INDEX IF NOT EXISTS idx_inbox_tags_workspace ON inbox_tags ("workspaceId")`);

    await qr.query(`
      ALTER TABLE conversations
        ADD COLUMN IF NOT EXISTS "inboxTagId" UUID REFERENCES inbox_tags(id) ON DELETE SET NULL
    `);

    await qr.query(`CREATE INDEX IF NOT EXISTS idx_conversations_inbox_tag ON conversations ("inboxTagId")`);

    await qr.query(`DROP TABLE IF EXISTS conversation_labels`);

    await qr.query(`ALTER TABLE labels DROP COLUMN IF EXISTS "position"`);
  }
}
