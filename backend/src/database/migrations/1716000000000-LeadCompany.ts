import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadCompany1716000000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    // contactId passa a ser opcional (empresa sem pessoa por trás)
    await runner.query(`ALTER TABLE "leads" ALTER COLUMN "contactId" DROP NOT NULL`);

    // nova coluna para vínculo direto com empresa
    await runner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "companyId" UUID`);
    await runner.query(`
      ALTER TABLE "leads"
      ADD CONSTRAINT "FK_leads_company"
      FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL
    `);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_companyId" ON "leads" ("companyId")`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP INDEX IF EXISTS "IDX_leads_companyId"`);
    await runner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "FK_leads_company"`);
    await runner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "companyId"`);
    await runner.query(`UPDATE "leads" SET "contactId" = gen_random_uuid() WHERE "contactId" IS NULL`);
    await runner.query(`ALTER TABLE "leads" ALTER COLUMN "contactId" SET NOT NULL`);
  }
}
