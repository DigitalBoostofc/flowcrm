import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductClient1716500000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    // Remove unique constraint anterior (workspaceId, name) se existir
    await runner.query(`
      ALTER TABLE products
        DROP CONSTRAINT IF EXISTS "UQ_products_workspaceId_name"
    `).catch(() => {});

    await runner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "clientId"   UUID`);
    await runner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "clientType" VARCHAR(20)`);
    await runner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "clientName" VARCHAR(200)`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "clientId"`);
    await runner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "clientType"`);
    await runner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "clientName"`);
  }
}
