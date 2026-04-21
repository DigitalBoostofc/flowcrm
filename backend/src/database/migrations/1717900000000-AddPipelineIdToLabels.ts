import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPipelineIdToLabels1717900000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE labels
      ADD COLUMN IF NOT EXISTS "pipelineId" uuid REFERENCES pipelines(id) ON DELETE CASCADE
    `);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_labels_pipelineId" ON labels ("pipelineId")`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP INDEX IF EXISTS "IDX_labels_pipelineId"`);
    await runner.query(`ALTER TABLE labels DROP COLUMN IF EXISTS "pipelineId"`);
  }
}
