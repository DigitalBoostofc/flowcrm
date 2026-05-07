import { MigrationInterface, QueryRunner } from 'typeorm';

export class MessageDedupIndex1747000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_dedup
        ON messages ("conversationId", direction, "sentAt")
        WHERE direction = 'outbound'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_messages_dedup`);
  }
}
