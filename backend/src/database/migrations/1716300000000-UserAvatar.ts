import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAvatar1716300000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR`);
    await runner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarKey" VARCHAR`);
    await runner.query(`ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR`);
    await runner.query(`ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "avatarKey" VARCHAR`);
    await runner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR`);
    await runner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "avatarKey" VARCHAR`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "avatarKey"`);
    await runner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "avatarUrl"`);
    await runner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "avatarKey"`);
    await runner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "avatarUrl"`);
    await runner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatarKey"`);
    await runner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatarUrl"`);
  }
}
