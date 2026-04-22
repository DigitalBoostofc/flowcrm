import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixLeadContactFkOnDelete1718300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Find all FK constraints on leads."contactId" dynamically (name varies by PG version)
    const rows: Array<{ conname: string }> = await queryRunner.query(`
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
      WHERE c.contype = 'f'
        AND t.relname = 'leads'
        AND a.attname = 'contactId';
    `);

    for (const row of rows) {
      await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "${row.conname}"`);
    }

    await queryRunner.query(`
      ALTER TABLE "leads"
        ADD CONSTRAINT "FK_leads_contactId"
        FOREIGN KEY ("contactId")
        REFERENCES "contacts"("id")
        ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "FK_leads_contactId"`);
    await queryRunner.query(`
      ALTER TABLE "leads"
        ADD CONSTRAINT "FK_leads_contactId"
        FOREIGN KEY ("contactId")
        REFERENCES "contacts"("id");
    `);
  }
}
