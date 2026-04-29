import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Soft-delete (lixeira) for the user-data core: leads, contacts, companies, products.
 * Plus DPO support: users.scheduledDeletionAt for the 30-day grace period before
 * an account is permanently erased.
 *
 * - deletedAt nullable timestamptz; rows with non-null deletedAt are in trash
 * - partial index speeds up the prune cron and the trash listing
 */
export class SoftDeleteAndDpo1718500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['leads', 'contacts', 'companies', 'products']) {
      await queryRunner.query(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS idx_${table}_deleted_at ON ${table} ("deletedAt") WHERE "deletedAt" IS NOT NULL`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS idx_${table}_workspace_deleted ON ${table} ("workspaceId", "deletedAt")`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "scheduledDeletionAt" timestamptz`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_scheduled_deletion ON users ("scheduledDeletionAt") WHERE "scheduledDeletionAt" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_scheduled_deletion`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS "scheduledDeletionAt"`);
    for (const table of ['leads', 'contacts', 'companies', 'products']) {
      await queryRunner.query(`DROP INDEX IF EXISTS idx_${table}_workspace_deleted`);
      await queryRunner.query(`DROP INDEX IF EXISTS idx_${table}_deleted_at`);
      await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS "deletedAt"`);
    }
  }
}
