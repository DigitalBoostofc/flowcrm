import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerOriginToLeads1717300000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS "customerOriginId" uuid,
        ADD CONSTRAINT fk_leads_customer_origin
          FOREIGN KEY ("customerOriginId")
          REFERENCES customer_origins(id)
          ON DELETE SET NULL;
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE leads
        DROP CONSTRAINT IF EXISTS fk_leads_customer_origin,
        DROP COLUMN IF EXISTS "customerOriginId";
    `);
  }
}
