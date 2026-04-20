import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductsDealScope1716600000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "clientId"`);
    await runner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "clientType"`);
    await runner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "clientName"`);
    await runner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "appliesTo"`);

    await runner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'UQ_products_workspace_name'
        ) THEN
          ALTER TABLE products
            ADD CONSTRAINT "UQ_products_workspace_name" UNIQUE ("workspaceId", name);
        END IF;
      END$$;
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "appliesTo" VARCHAR(20) NOT NULL DEFAULT 'ambos'`);
    await runner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "clientId" UUID`);
    await runner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "clientType" VARCHAR(20)`);
    await runner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "clientName" VARCHAR(200)`);
  }
}
