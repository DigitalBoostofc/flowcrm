import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adiciona `lastReadAt` em conversations para suportar mark-as-read explícito.
 * NULL = nunca aberta pelo usuário (qualquer mensagem inbound conta como unread).
 */
export class AddConversationLastReadAt1718900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "lastReadAt" timestamptz NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN IF EXISTS "lastReadAt"`);
  }
}
