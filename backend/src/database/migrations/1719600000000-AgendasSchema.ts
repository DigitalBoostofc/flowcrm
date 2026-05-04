import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgendasSchema1719600000000 implements MigrationInterface {
  name = 'AgendasSchema1719600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "appointments_status_enum" AS ENUM ('pending','confirmed','cancelled','completed');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agendas" (
        "id"           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "workspaceId"  uuid NOT NULL,
        "name"         varchar(120) NOT NULL,
        "description"  text,
        "ownerName"    varchar(80),
        "color"        varchar(7),
        "services"     jsonb NOT NULL DEFAULT '[]',
        "workingHours" jsonb,
        "isActive"     boolean NOT NULL DEFAULT true,
        "createdAt"    timestamptz NOT NULL DEFAULT now(),
        "updatedAt"    timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agendas_workspaceId" ON "agendas" ("workspaceId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agendas_isActive" ON "agendas" ("isActive")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "appointments" (
        "id"          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "agendaId"    uuid NOT NULL,
        "contactId"   uuid,
        "leadId"      uuid,
        "title"       varchar(200) NOT NULL,
        "description" text,
        "service"     varchar(80),
        "startAt"     timestamptz NOT NULL,
        "endAt"       timestamptz NOT NULL,
        "status"      "appointments_status_enum" NOT NULL DEFAULT 'pending',
        "notes"       text,
        "createdById" uuid,
        "metadata"    jsonb NOT NULL DEFAULT '{}',
        "createdAt"   timestamptz NOT NULL DEFAULT now(),
        "updatedAt"   timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_workspaceId" ON "appointments" ("workspaceId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_agendaId"    ON "appointments" ("agendaId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_startAt"     ON "appointments" ("startAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_status"      ON "appointments" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_contactId"   ON "appointments" ("contactId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_leadId"      ON "appointments" ("leadId")`);

    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD CONSTRAINT "FK_appointments_agenda"
      FOREIGN KEY ("agendaId") REFERENCES "agendas"("id") ON DELETE CASCADE
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "FK_appointments_agenda"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agendas"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "appointments_status_enum"`);
  }
}
