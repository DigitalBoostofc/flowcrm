import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Permite múltiplas conversas por lead+canal (ex: cliente troca número
 * de WhatsApp e o histórico anterior é preservado).
 *
 * - Drop unique (leadId, channelType) — descoberto dinamicamente pra
 *   ser independente do nome gerado pelo TypeORM
 * - Adiciona unique parcial (workspaceId, leadId, channelType, externalId)
 *   WHERE externalId IS NOT NULL — garante 1 conversa por (canal, externalId)
 *   sem bloquear leads com múltiplas conversas no mesmo canal
 * - Mantém index legacy (workspaceId, leadId, channelType) WHERE externalId IS NULL
 *   pra suportar lookup de findOrCreate sem externalId
 */
export class MultiConversationsPerLead1719000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop unique constraint anterior (nome dinâmico — TypeORM @Unique gera UQ_<hash>)
    await queryRunner.query(`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN
          SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          WHERE rel.relname = 'conversations'
            AND con.contype = 'u'
            AND array_length(con.conkey, 1) = 2
        LOOP
          EXECUTE format('ALTER TABLE conversations DROP CONSTRAINT %I', r.conname);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_external ` +
      `ON conversations ("workspaceId", "leadId", "channelType", "externalId") ` +
      `WHERE "externalId" IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_conversations_legacy_lookup ` +
      `ON conversations ("workspaceId", "leadId", "channelType") ` +
      `WHERE "externalId" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_conversations_legacy_lookup`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_conversations_unique_external`);
    // Best-effort restore — falha se houver duplicatas existentes
    await queryRunner.query(
      `ALTER TABLE conversations ADD CONSTRAINT "UQ_conversations_lead_channel" UNIQUE ("leadId", "channelType")`,
    );
  }
}
