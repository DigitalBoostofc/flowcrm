import { MigrationInterface, QueryRunner } from 'typeorm';

export class Products1716500000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspaceId" UUID NOT NULL,
        name         VARCHAR(150) NOT NULL,
        type         VARCHAR(20) NOT NULL DEFAULT 'produto',
        "appliesTo"  VARCHAR(20) NOT NULL DEFAULT 'ambos',
        price        NUMERIC(12,2) NULL,
        active       BOOLEAN NOT NULL DEFAULT true,
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_products_workspace_name" UNIQUE ("workspaceId", name)
      )
    `);
    await runner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_workspaceId" ON products ("workspaceId")`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS products`);
  }
}
