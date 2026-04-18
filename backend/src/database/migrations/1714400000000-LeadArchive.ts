import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadArchive1714400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "archivedAt"`);
  }
}
