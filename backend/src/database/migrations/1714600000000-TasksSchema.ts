import { MigrationInterface, QueryRunner } from 'typeorm';

export class TasksSchema1714600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tasks_type_enum" AS ENUM ('email','call','whatsapp','proposal','meeting','visit');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tasks_status_enum" AS ENUM ('pending','completed');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tasks_targettype_enum" AS ENUM ('contact','lead','company');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "type" "tasks_type_enum" NOT NULL,
        "description" text NOT NULL,
        "dueDate" timestamptz,
        "status" "tasks_status_enum" NOT NULL DEFAULT 'pending',
        "responsibleIds" jsonb NOT NULL DEFAULT '[]',
        "targetType" "tasks_targettype_enum",
        "targetId" uuid,
        "targetLabel" varchar,
        "attachments" jsonb NOT NULL DEFAULT '[]',
        "createdById" uuid,
        "completedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_type" ON "tasks" ("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_status" ON "tasks" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_dueDate" ON "tasks" ("dueDate")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_targetId" ON "tasks" ("targetId")`);

    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_createdBy"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_targettype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_type_enum"`);
  }
}
