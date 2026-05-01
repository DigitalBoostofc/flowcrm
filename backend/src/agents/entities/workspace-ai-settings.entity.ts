import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type AiProvider = 'anthropic';
export type AiKeySource = 'platform' | 'byo';

@Entity('workspace_ai_settings')
export class WorkspaceAiSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  workspaceId: string;

  @Column({ type: 'varchar', length: 20, default: 'anthropic' })
  provider: AiProvider;

  /**
   * Onde a API key vive:
   * - 'platform' = workspace usa ANTHROPIC_API_KEY global do FlowCRM (cobrado no plano)
   * - 'byo'      = cliente plugou a própria key (campo `apiKeyEncrypted`)
   */
  @Column({ type: 'varchar', length: 20, default: 'platform' })
  keySource: AiKeySource;

  /** Encrypted via crypto-helper. NUNCA retornar via GET. */
  @Column({ type: 'text', nullable: true })
  apiKeyEncrypted: string | null;

  /** Últimos 4 caracteres da key (apenas pra UI mostrar mascarada). */
  @Column({ type: 'varchar', length: 8, nullable: true })
  apiKeyLast4: string | null;

  @Column({ type: 'varchar', length: 60, default: 'claude-haiku-4-5' })
  defaultModel: string;

  /** Soft cap mensal de tokens. NULL = sem limite (plano enterprise). */
  @Column({ type: 'integer', nullable: true })
  monthlyTokenBudget: number | null;

  /** Contador zerado mensalmente via scheduler. */
  @Column({ type: 'integer', default: 0 })
  tokensUsedThisMonth: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastValidatedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
