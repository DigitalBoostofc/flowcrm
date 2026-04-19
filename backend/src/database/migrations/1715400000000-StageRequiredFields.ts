import { MigrationInterface, QueryRunner } from 'typeorm';

export class StageRequiredFields1715400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stage_required_fields" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "stageId" uuid NOT NULL,
        "targetType" varchar(20) NOT NULL,
        "fieldKey" varchar(80) NOT NULL,
        "question" text,
        "position" int NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stage_required_fields" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stage_required_fields_stage" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_stage_required_fields_key" UNIQUE ("stageId", "targetType", "fieldKey")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stage_required_fields_stage" ON "stage_required_fields" ("stageId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "stage_required_fields"`);
  }
}
