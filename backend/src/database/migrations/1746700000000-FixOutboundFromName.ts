import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixOutboundFromName1746700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Clear fromName values that were incorrectly stored as the WhatsApp Business
    // profile name (e.g. "Cleanox") for conversations created via outbound messages.
    // The business name is stored in channel_configs.config->>'profileName'.
    await queryRunner.query(`
      UPDATE conversations c
      SET "fromName" = NULL
      FROM channel_configs ch
      WHERE ch."workspaceId" = c."workspaceId"
        AND c."fromName" IS NOT NULL
        AND c."fromName" = ch.config->>'profileName'
        AND ch.active = true;
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // Data cannot be recovered — outbound fromName values were never correct.
  }
}
