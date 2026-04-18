import { MigrationInterface, QueryRunner } from 'typeorm';

export class MessagingSchema1714100000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "leadId" UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        "channelType" VARCHAR(20) NOT NULL,
        "externalId" VARCHAR,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE ("leadId", "channelType")
      );
      CREATE INDEX idx_conversations_lead ON conversations("leadId");

      CREATE TABLE messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversationId" UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        direction VARCHAR(10) NOT NULL,
        type VARCHAR(10) NOT NULL DEFAULT 'text',
        status VARCHAR(10) NOT NULL DEFAULT 'pending',
        "externalMessageId" VARCHAR UNIQUE,
        "sentAt" TIMESTAMPTZ DEFAULT NOW(),
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX idx_messages_conv_sent ON messages("conversationId", "sentAt" DESC);

      CREATE TABLE channel_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        type VARCHAR(20) NOT NULL,
        config JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'disconnected',
        active BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX idx_channel_type_active ON channel_configs(type, active);

      CREATE TABLE automations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "stageId" UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
        "delayMinutes" INT NOT NULL DEFAULT 0,
        "channelType" VARCHAR(20) NOT NULL,
        "channelConfigId" UUID NOT NULL REFERENCES channel_configs(id),
        "templateId" UUID NOT NULL REFERENCES message_templates(id),
        active BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE ("stageId")
      );

      CREATE TABLE automation_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "automationId" UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
        "leadId" UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        "executedAt" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE ("automationId", "leadId")
      );
      CREATE INDEX idx_execs_lead ON automation_executions("leadId");

      CREATE TABLE scheduled_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversationId" UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        "scheduledAt" TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        "createdById" UUID REFERENCES users(id),
        "bullJobId" VARCHAR,
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX idx_scheduled_pending ON scheduled_messages(status, "scheduledAt") WHERE status = 'pending';
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DROP TABLE IF EXISTS scheduled_messages;
      DROP TABLE IF EXISTS automation_executions;
      DROP TABLE IF EXISTS automations;
      DROP TABLE IF EXISTS channel_configs;
      DROP TABLE IF EXISTS messages;
      DROP TABLE IF EXISTS conversations;
    `);
  }
}
