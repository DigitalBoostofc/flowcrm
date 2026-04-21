import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCollaboratorRoles1717100000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const rows: Array<{ typname: string }> = await runner.query(
      `SELECT t.typname
         FROM pg_type t
         JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'users_role_enum'
        GROUP BY t.typname`,
    );
    if (rows.length === 0) return;

    await runner.query(`ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'manager'`);
    await runner.query(`ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'seller'`);
  }

  async down(): Promise<void> {
    // Postgres não suporta remover valores de enum sem recriar o tipo.
  }
}
