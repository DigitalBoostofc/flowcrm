import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationFromAvatarUrl1720000000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS "fromAvatarUrl" text NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE conversations DROP COLUMN IF EXISTS "fromAvatarUrl";
    `);
  }
}
