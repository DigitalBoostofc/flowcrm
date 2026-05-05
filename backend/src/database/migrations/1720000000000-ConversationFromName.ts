import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationFromName1720000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS "fromName" varchar NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE conversations DROP COLUMN IF EXISTS "fromName";
    `);
  }
}
