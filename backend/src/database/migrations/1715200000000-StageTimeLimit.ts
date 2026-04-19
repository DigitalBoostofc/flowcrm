import { MigrationInterface, QueryRunner } from 'typeorm';

export class StageTimeLimit1715200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stages"
        ADD COLUMN IF NOT EXISTS "timeLimitDays" int
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stages" DROP COLUMN IF EXISTS "timeLimitDays"`);
  }
}
