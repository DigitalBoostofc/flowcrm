import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgendaAddOwnerId1719600000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE agendas
        ADD COLUMN IF NOT EXISTS "ownerId" uuid;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_agendas_ownerId"
        ON agendas ("ownerId");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agendas_ownerId"`);
    await queryRunner.query(`ALTER TABLE agendas DROP COLUMN IF EXISTS "ownerId"`);
  }
}
