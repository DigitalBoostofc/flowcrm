import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixRoleEnumValues1718200000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    // The initial migration created the enum as 'user_role' but AddCollaboratorRoles
    // looked for 'users_role_enum' (TypeORM convention) and silently skipped.
    // This migration adds the missing values to whichever type name exists.
    for (const typeName of ['user_role', 'users_role_enum']) {
      const rows: Array<{ typname: string }> = await runner.query(
        `SELECT t.typname FROM pg_type t WHERE t.typname = $1`,
        [typeName],
      );
      if (rows.length === 0) continue;
      await runner.query(
        `ALTER TYPE "${typeName}" ADD VALUE IF NOT EXISTS 'manager'`,
      );
      await runner.query(
        `ALTER TYPE "${typeName}" ADD VALUE IF NOT EXISTS 'seller'`,
      );
    }
  }

  async down(): Promise<void> {
    // Postgres does not support removing enum values without recreating the type.
  }
}
