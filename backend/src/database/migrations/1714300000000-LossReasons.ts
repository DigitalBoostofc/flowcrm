import { MigrationInterface, QueryRunner } from 'typeorm';

export class LossReasons1714300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "loss_reasons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "label" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_loss_reasons_label" UNIQUE ("label"),
        CONSTRAINT "PK_loss_reasons" PRIMARY KEY ("id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "loss_reasons"`);
  }
}
