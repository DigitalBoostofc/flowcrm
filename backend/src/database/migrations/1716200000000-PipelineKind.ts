import { MigrationInterface, QueryRunner } from 'typeorm';

export class PipelineKind1716200000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE pipelines
      ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'sale'
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE pipelines DROP COLUMN IF EXISTS kind`);
  }
}
