import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationArchive1746600000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE conversations
        ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMPTZ
    `);

    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_archived
        ON conversations ("archivedAt")
        WHERE "archivedAt" IS NOT NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_conversations_archived`);
    await qr.query(`ALTER TABLE conversations DROP COLUMN IF EXISTS "archivedAt"`);
  }
}
