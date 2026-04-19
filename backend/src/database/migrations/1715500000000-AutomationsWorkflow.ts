import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutomationsWorkflow1715500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "automation_executions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "automations" CASCADE`);

    await queryRunner.query(`
      CREATE TABLE "automations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(120) NOT NULL,
        "triggerType" varchar(20) NOT NULL,
        "pipelineId" uuid,
        "stageId" uuid,
        "active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_automations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_automations_pipeline" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_automations_stage" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE CASCADE,
        CONSTRAINT "CK_automations_trigger" CHECK (
          ("triggerType" = 'pipeline' AND "pipelineId" IS NOT NULL AND "stageId" IS NULL) OR
          ("triggerType" = 'stage' AND "stageId" IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_automations_pipeline" ON "automations" ("pipelineId")`);
    await queryRunner.query(`CREATE INDEX "IDX_automations_stage" ON "automations" ("stageId")`);

    await queryRunner.query(`
      CREATE TABLE "automation_steps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "automationId" uuid NOT NULL,
        "position" int NOT NULL,
        "type" varchar(30) NOT NULL,
        "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_automation_steps" PRIMARY KEY ("id"),
        CONSTRAINT "FK_automation_steps_automation" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_automation_steps_automation" ON "automation_steps" ("automationId")`);

    await queryRunner.query(`
      CREATE TABLE "automation_executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "automationId" uuid NOT NULL,
        "leadId" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "currentStepPosition" int NOT NULL DEFAULT 0,
        "startedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_automation_executions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_automation_executions_automation" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_automation_executions_lead" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_automation_executions_auto_lead" UNIQUE ("automationId", "leadId")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_automation_executions_automation" ON "automation_executions" ("automationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_automation_executions_lead" ON "automation_executions" ("leadId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "automation_executions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "automation_steps" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "automations" CASCADE`);
  }
}
