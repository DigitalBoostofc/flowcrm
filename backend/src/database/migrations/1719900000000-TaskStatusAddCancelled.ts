import { MigrationInterface, QueryRunner } from 'typeorm';

export class TaskStatusAddCancelled1719900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE tasks_status_enum ADD VALUE IF NOT EXISTS 'cancelled';`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL não permite remover valores de enum; apenas documentamos.
  }
}
