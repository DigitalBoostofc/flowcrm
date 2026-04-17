import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1714000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TYPE user_role AS ENUM ('owner', 'agent');

      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        "passwordHash" VARCHAR NOT NULL,
        role user_role NOT NULL DEFAULT 'agent',
        active BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE pipelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE stages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        color VARCHAR NOT NULL DEFAULT '#3b82f6',
        "pipelineId" UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        phone VARCHAR,
        email VARCHAR,
        "channelOrigin" VARCHAR,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "contactId" UUID NOT NULL REFERENCES contacts(id),
        "stageId" UUID NOT NULL REFERENCES stages(id),
        "pipelineId" UUID NOT NULL REFERENCES pipelines(id),
        "assignedToId" UUID REFERENCES users(id),
        value DECIMAL(10,2),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE message_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        body TEXT NOT NULL,
        "createdById" UUID REFERENCES users(id),
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS message_templates;
      DROP TABLE IF EXISTS leads;
      DROP TABLE IF EXISTS contacts;
      DROP TABLE IF EXISTS stages;
      DROP TABLE IF EXISTS pipelines;
      DROP TABLE IF EXISTS users;
      DROP TYPE IF EXISTS user_role;
    `);
  }
}
