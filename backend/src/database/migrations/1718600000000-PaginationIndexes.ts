import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Compound indexes (workspaceId, sort key) for the entities now paginated:
 * contacts/companies ordered by createdAt DESC, products by name ASC.
 *
 * Partial WHERE "deletedAt" IS NULL keeps the index small (matches the hot
 * code path that excludes soft-deleted rows via TypeORM @DeleteDateColumn).
 */
export class PaginationIndexes1718600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_contacts_workspace_created_active ` +
      `ON contacts ("workspaceId", "createdAt" DESC) WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_companies_workspace_created_active ` +
      `ON companies ("workspaceId", "createdAt" DESC) WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_products_workspace_name_active ` +
      `ON products ("workspaceId", "name") WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_workspace_name_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_companies_workspace_created_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_workspace_created_active`);
  }
}
