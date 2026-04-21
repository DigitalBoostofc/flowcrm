import { MigrationInterface, QueryRunner } from 'typeorm';

export class GrandfatherExistingWorkspaces1717000000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    // Coloca todas as contas já existentes no plano Performance (melhor plano),
    // com assinatura ativa - garantindo que continuem com acesso total.
    await runner.query(`
      UPDATE "workspaces"
      SET "planSlug" = 'performance',
          "subscriptionStatus" = 'active'
      WHERE "createdAt" <= now()
    `);
  }

  async down(): Promise<void> {
    // Sem down: é uma concessão histórica, reverter poderia bloquear clientes.
  }
}
