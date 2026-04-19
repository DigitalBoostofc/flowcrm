import { MigrationInterface, QueryRunner } from 'typeorm';

export class PipelineSigla1715100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pipelines"
        ADD COLUMN IF NOT EXISTS "sigla" varchar(10)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pipelines" DROP COLUMN IF EXISTS "sigla"`);
  }
}
