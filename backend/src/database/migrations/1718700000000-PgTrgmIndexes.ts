import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Trigram (pg_trgm) GIN indexes for the columns used in cross-entity search
 * and per-entity findAll search filters. Without these, every `ILIKE '%term%'`
 * with a leading wildcard does a seq scan — full table per query.
 *
 * Postgres planner uses GIN trgm automatically when the predicate is `ILIKE`
 * with %. No code change needed in services.
 *
 * Covers:
 *   - contacts.name / phone / email      → search.service + contacts.findAll
 *   - leads.title                        → search.service
 *   - companies.name / razaoSocial / cnpj → companies.findAll
 *
 * descricao columns not indexed: longer text + lower search value (users
 * normally search by name/cnpj). Adding later is cheap if needed.
 */
export class PgTrgmIndexes1718700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm ON contacts USING gin ("name" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_contacts_phone_trgm ON contacts USING gin ("phone" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_contacts_email_trgm ON contacts USING gin ("email" gin_trgm_ops)`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_leads_title_trgm ON leads USING gin ("title" gin_trgm_ops)`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING gin ("name" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_companies_razao_trgm ON companies USING gin ("razaoSocial" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_companies_cnpj_trgm ON companies USING gin ("cnpj" gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_companies_cnpj_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_companies_razao_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_companies_name_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leads_title_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_email_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_phone_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_name_trgm`);
    // pg_trgm extension intentionally not dropped — other migrations or tools may rely on it.
  }
}
