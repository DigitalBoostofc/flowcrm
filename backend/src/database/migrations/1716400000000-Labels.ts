import { MigrationInterface, QueryRunner } from 'typeorm';

export class Labels1716400000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS labels (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspaceId" UUID NOT NULL,
        name         VARCHAR(100) NOT NULL DEFAULT '',
        color        VARCHAR(20) NOT NULL,
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_labels_workspaceId" ON labels ("workspaceId")`);

    await runner.query(`
      CREATE TABLE IF NOT EXISTS lead_labels (
        "leadId"  UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        "labelId" UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
        PRIMARY KEY ("leadId", "labelId")
      )
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS lead_labels`);
    await runner.query(`DROP TABLE IF EXISTS labels`);
  }
}
