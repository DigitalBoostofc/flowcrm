import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFrozenToLeadStatusEnum1718100000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'frozen'`);
  }

  async down(_runner: QueryRunner): Promise<void> {
    // PostgreSQL não suporta remoção de valor de enum nativamente
  }
}
