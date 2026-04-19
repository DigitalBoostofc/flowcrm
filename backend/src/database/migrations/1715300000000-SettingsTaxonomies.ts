import { MigrationInterface, QueryRunner } from 'typeorm';

export class SettingsTaxonomies1715300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_origins" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_customer_origins_name" UNIQUE ("name"),
        CONSTRAINT "PK_customer_origins" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_customer_categories_name" UNIQUE ("name"),
        CONSTRAINT "PK_customer_categories" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sectors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_sectors_name" UNIQUE ("name"),
        CONSTRAINT "PK_sectors" PRIMARY KEY ("id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sectors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_origins"`);
  }
}
