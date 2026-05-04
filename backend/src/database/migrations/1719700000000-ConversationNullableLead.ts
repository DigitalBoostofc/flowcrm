import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationNullableLead1719700000000 implements MigrationInterface {
  name = 'ConversationNullableLead1719700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Allow conversations to exist without a lead (unqualified inbound)
    await queryRunner.query(`ALTER TABLE conversations ALTER COLUMN "leadId" DROP NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Delete unqualified conversations before reverting (or this will fail on NOT NULL constraint)
    await queryRunner.query(`DELETE FROM conversations WHERE "leadId" IS NULL`);
    await queryRunner.query(`ALTER TABLE conversations ALTER COLUMN "leadId" SET NOT NULL`);
  }
}
