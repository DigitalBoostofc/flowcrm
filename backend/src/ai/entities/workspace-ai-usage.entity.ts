import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Contabiliza tokens consumidos por workspace/mês.
 * Linha por mês (workspaceId, 'YYYY-MM') — cria sob demanda na primeira chamada.
 */
@Entity('workspace_ai_usage')
@Index(['workspaceId', 'month'], { unique: true })
export class WorkspaceAiUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'varchar', length: 7 })
  month: string;

  @Column({ type: 'int', default: 0 })
  tokensUsed: number;

  @Column({ type: 'int', nullable: true })
  monthlyBudgetTokens: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
