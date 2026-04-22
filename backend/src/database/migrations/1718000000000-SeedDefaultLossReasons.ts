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
        await runner.query(
          `INSERT INTO loss_reasons ("workspaceId", label)
           SELECT $1, $2
           WHERE NOT EXISTS (
             SELECT 1 FROM loss_reasons WHERE "workspaceId" = $1 AND label = $2
           )`,
          [ws.id, label],
        );
      }
    }
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(
      `DELETE FROM loss_reasons WHERE label = ANY($1)`,
      [DEFAULTS],
    );
  }
}
