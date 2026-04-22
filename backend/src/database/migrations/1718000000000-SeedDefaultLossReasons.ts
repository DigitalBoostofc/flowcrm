import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULTS = [
  'Preço alto',
  'Escolheu concorrente',
  'Sem interesse',
  'Sem resposta',
  'Timing ruim',
  'Produto não atende',
  'Processo demorou',
];

export class SeedDefaultLossReasons1718000000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    // Fix unique constraint from label-only to (workspaceId, label)
    await runner.query(`ALTER TABLE loss_reasons DROP CONSTRAINT IF EXISTS "UQ_loss_reasons_label"`);
    await runner.query(`
      ALTER TABLE loss_reasons
      ADD CONSTRAINT "UQ_loss_reasons_workspace_label"
      UNIQUE ("workspaceId", label)
    `);

    // Seed defaults into every workspace
    const workspaces: { id: string }[] = await runner.query(`SELECT id FROM workspaces`);
    for (const ws of workspaces) {
      for (const label of DEFAULTS) {
        await runner.query(
          `INSERT INTO loss_reasons ("workspaceId", label) VALUES ($1, $2)
           ON CONFLICT ("workspaceId", label) DO NOTHING`,
          [ws.id, label],
        );
      }
    }
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE loss_reasons DROP CONSTRAINT IF EXISTS "UQ_loss_reasons_workspace_label"`);
    await runner.query(`ALTER TABLE loss_reasons ADD CONSTRAINT "UQ_loss_reasons_label" UNIQUE (label)`);
    for (const label of DEFAULTS) {
      await runner.query(`DELETE FROM loss_reasons WHERE label = $1`, [label]);
    }
  }
}
