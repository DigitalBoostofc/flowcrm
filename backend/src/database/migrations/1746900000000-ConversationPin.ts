import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationPin1746900000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMPTZ`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE conversations DROP COLUMN IF EXISTS "pinnedAt"`);
  }
}
