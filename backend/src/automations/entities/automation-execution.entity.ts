import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique, Index,
} from 'typeorm';

export type AutomationExecutionStatus = 'pending' | 'completed' | 'filtered' | 'failed';

@Entity('automation_executions')
@Unique(['automationId', 'leadId'])
export class AutomationExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'uuid' })
  @Index()
  automationId: string;

  @Column({ type: 'uuid' })
  @Index()
  leadId: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: AutomationExecutionStatus;

  @Column({ type: 'int', default: 0 })
  currentStepPosition: number;

  @CreateDateColumn({ type: 'timestamptz' })
  startedAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
