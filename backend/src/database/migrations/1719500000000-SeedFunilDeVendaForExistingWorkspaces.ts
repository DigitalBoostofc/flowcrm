import { MigrationInterface, QueryRunner } from 'typeorm';

const STAGES = [
  { name: 'Lead', color: '#3b82f6', position: 0 },
  { name: 'Qualificação', color: '#8b5cf6', position: 1 },
  { name: 'Proposta', color: '#f59e0b', position: 2 },
  { name: 'Follow up', color: '#f97316', position: 3 },
  { name: 'Aguardando Pagamento', color: '#ef4444', position: 4 },
  { name: 'Fechamento', color: '#10b981', position: 5 },
];

export class SeedFunilDeVendaForExistingWorkspaces1719500000000 implements MigrationInterface {
  name = 'SeedFunilDeVendaForExistingWorkspaces1719500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Find workspaces that have no pipeline with at least one stage
    const workspaces: { id: string }[] = await queryRunner.query(`
      SELECT w.id
      FROM workspaces w
      WHERE NOT EXISTS (
        SELECT 1
        FROM pipelines p
        JOIN stages s ON s."pipelineId" = p.id
        WHERE p."workspaceId" = w.id
      )
    `);

    for (const ws of workspaces) {
      // Check if a pipeline already exists (but without stages)
      const existing: { id: string }[] = await queryRunner.query(
        `SELECT id FROM pipelines WHERE "workspaceId" = $1 LIMIT 1`,
        [ws.id],
      );

      let pipelineId: string;

      if (existing.length > 0) {
        pipelineId = existing[0].id;
        await queryRunner.query(
          `UPDATE pipelines SET name = 'Funil de venda', "isDefault" = true WHERE id = $1`,
          [pipelineId],
        );
      } else {
        const result: { id: string }[] = await queryRunner.query(
          `INSERT INTO pipelines ("workspaceId", name, "isDefault", kind, "createdAt", "updatedAt")
           VALUES ($1, 'Funil de venda', true, 'sale', NOW(), NOW())
           RETURNING id`,
          [ws.id],
        );
        pipelineId = result[0].id;
      }

      for (const stage of STAGES) {
        await queryRunner.query(
          `INSERT INTO stages ("workspaceId", "pipelineId", name, color, position, "createdAt")
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [ws.id, pipelineId, stage.name, stage.color, stage.position],
        );
      }
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // Not reversible — removing auto-seeded pipelines could destroy lead data
  }
}
