import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContactActivities1717500000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TYPE contact_activity_type_enum AS ENUM
        ('note','email','call','whatsapp','meeting','visit','proposal');

      CREATE TABLE IF NOT EXISTS contact_activities (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspaceId" uuid NOT NULL,
        "contactId"   uuid REFERENCES contacts(id) ON DELETE CASCADE,
        "companyId"   uuid REFERENCES companies(id) ON DELETE CASCADE,
        type          contact_activity_type_enum NOT NULL DEFAULT 'note',
        body          text NOT NULL,
        "createdById" uuid REFERENCES users(id) ON DELETE SET NULL,
        "scheduledAt" timestamp,
        "completedAt" timestamp,
        "createdAt"   timestamp NOT NULL DEFAULT NOW(),
        "updatedAt"   timestamp NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_contact_activities_contact ON contact_activities("contactId");
      CREATE INDEX idx_contact_activities_company ON contact_activities("companyId");
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      DROP TABLE IF EXISTS contact_activities;
      DROP TYPE IF EXISTS contact_activity_type_enum;
    `);
  }
}
