import { MigrationInterface, QueryRunner } from 'typeorm';

// CONCURRENTLY requires running outside a transaction block.
// TypeORM wraps each migration in a transaction, so we opt out here.
export class MessageDedupIndex1747000000000 implements MigrationInterface {
  transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_dedup
        ON messages ("conversationId", direction, "sentAt")
        WHERE direction = 'outbound'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_messages_dedup`);
  }
}
