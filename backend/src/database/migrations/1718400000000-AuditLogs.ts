import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLogs1718400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "workspaceId" uuid,
        "userId"      uuid,
        action        varchar(80)  NOT NULL,
        "resourceType" varchar(60),
        "resourceId"  uuid,
        changes       jsonb,
        "ipAddress"   inet,
        "userAgent"   text,
        "requestId"   varchar(80),
        "createdAt"   timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_audit_workspace_created ON audit_logs ("workspaceId", "createdAt" DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_audit_resource ON audit_logs ("workspaceId", "resourceType", "resourceId");
    `);
    await queryRunner.query(`
      CREATE INDEX idx_audit_action_created ON audit_logs (action, "createdAt" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_action_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_resource`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_workspace_created`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
  }
}
