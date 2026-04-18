import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadV21714200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE lead_status AS ENUM ('active', 'won', 'lost');

      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS title VARCHAR,
        ADD COLUMN IF NOT EXISTS status lead_status NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS "lossReason" VARCHAR,
        ADD COLUMN IF NOT EXISTS "startDate" DATE,
        ADD COLUMN IF NOT EXISTS "conclusionDate" DATE,
        ADD COLUMN IF NOT EXISTS "stageEnteredAt" TIMESTAMP NOT NULL DEFAULT NOW();

      UPDATE leads SET "stageEnteredAt" = "createdAt" WHERE "stageEnteredAt" IS NULL;

      ALTER TABLE contacts
        ADD COLUMN IF NOT EXISTS origin VARCHAR;

      CREATE TYPE activity_type AS ENUM ('note', 'call', 'whatsapp', 'meeting', 'visit', 'proposal');

      CREATE TABLE lead_activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "leadId" UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        type activity_type NOT NULL DEFAULT 'note',
        body TEXT NOT NULL,
        "createdById" UUID REFERENCES users(id),
        "createdAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX idx_lead_activities_lead ON lead_activities("leadId");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS lead_activities;
      DROP TYPE IF EXISTS activity_type;
      ALTER TABLE contacts DROP COLUMN IF EXISTS origin;
      ALTER TABLE leads
        DROP COLUMN IF EXISTS title,
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS "lossReason",
        DROP COLUMN IF EXISTS "startDate",
        DROP COLUMN IF EXISTS "conclusionDate",
        DROP COLUMN IF EXISTS "stageEnteredAt";
      DROP TYPE IF EXISTS lead_status;
    `);
  }
}
