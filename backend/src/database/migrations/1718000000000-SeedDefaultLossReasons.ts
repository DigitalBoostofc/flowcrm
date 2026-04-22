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
    const workspaces: { id: string }[] = await runner.query(`SELECT id FROM workspaces`);
    for (const ws of workspaces) {
      for (const label of DEFAULTS) {
        const existing = await runner.query(
          `SELECT 1 FROM loss_reasons WHERE "workspaceId" = $1 AND label = $2`,
          [ws.id, label],
        );
        if (existing.length === 0) {
          await runner.query(
            `INSERT INTO loss_reasons ("workspaceId", label) VALUES ($1, $2)`,
            [ws.id, label],
          );
        }
      }
    }
  }

  async down(runner: QueryRunner): Promise<void> {
    for (const label of DEFAULTS) {
      await runner.query(`DELETE FROM loss_reasons WHERE label = $1`, [label]);
    }
  }
}
