import { MigrationInterface, QueryRunner } from 'typeorm';

export class TaskAddLocation1719800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location varchar;`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS location;`);
  }
}
