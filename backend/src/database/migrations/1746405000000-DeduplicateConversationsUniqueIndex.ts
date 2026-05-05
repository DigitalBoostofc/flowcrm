import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corrige duplicatas de conversas causadas por race condition.
 *
 * O índice anterior era UNIQUE(workspaceId, leadId, channelType, externalId).
 * Como PostgreSQL trata NULL != NULL em constraints únicas, múltiplas linhas
 * com leadId=null e o mesmo externalId eram permitidas — criando conversas
 * duplicadas quando mensagens chegavam simultaneamente.
 *
 * Esta migration:
 * 1. Desduplicata conversas existentes: reatribui mensagens para a mais
 *    antiga e deleta as cópias mais novas.
 * 2. Remove o índice antigo que incluía leadId.
 * 3. Cria novo índice UNIQUE(workspaceId, channelType, externalId) que
 *    garante unicidade independente do leadId.
 */
export class DeduplicateConversationsUniqueIndex1746405000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Reassign messages from duplicate conversations to the oldest one
    await queryRunner.query(`
      WITH dupes AS (
        SELECT
          "workspaceId",
          "channelType",
          "externalId",
          MIN("createdAt") AS min_created,
          array_agg(id ORDER BY "createdAt" ASC) AS ids
        FROM conversations
        WHERE "externalId" IS NOT NULL
        GROUP BY "workspaceId", "channelType", "externalId"
        HAVING COUNT(*) > 1
      ),
      winners AS (
        SELECT
          d."workspaceId",
          d."channelType",
          d."externalId",
          d.ids[1] AS winner_id,
          d.ids[2:] AS loser_ids
        FROM dupes d
      )
      UPDATE messages m
      SET "conversationId" = w.winner_id
      FROM winners w,
           unnest(w.loser_ids) AS loser_id
      WHERE m."conversationId" = loser_id
    `);

    // Step 2: Delete duplicate (loser) conversations
    await queryRunner.query(`
      WITH dupes AS (
        SELECT
          "workspaceId",
          "channelType",
          "externalId",
          array_agg(id ORDER BY "createdAt" ASC) AS ids
        FROM conversations
        WHERE "externalId" IS NOT NULL
        GROUP BY "workspaceId", "channelType", "externalId"
        HAVING COUNT(*) > 1
      )
      DELETE FROM conversations
      WHERE id IN (
        SELECT unnest(ids[2:]) FROM dupes
      )
    `);

    // Step 3: Drop the old unique index that included leadId
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_conversations_unique_external`,
    );

    // Step 4: Create new unique index without leadId
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_conversations_unique_by_external ` +
      `ON conversations ("workspaceId", "channelType", "externalId") ` +
      `WHERE "externalId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_conversations_unique_by_external`);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_external ` +
      `ON conversations ("workspaceId", "leadId", "channelType", "externalId") ` +
      `WHERE "externalId" IS NOT NULL`,
    );
  }
}
