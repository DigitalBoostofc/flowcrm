import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adiciona coluna `score` nullable (0-100) em leads para suportar
 * lead scoring manual e cálculo determinístico via LeadScoringService.
 * NULL = lead ainda não pontuado.
 */
export class AddLeadScore1718800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "score" integer NULL`);
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "chk_leads_score_range" CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 100))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "chk_leads_score_range"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "score"`);
  }
}
