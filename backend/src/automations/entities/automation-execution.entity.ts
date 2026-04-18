import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, Index } from 'typeorm';

@Entity('automation_executions')
@Unique(['automationId', 'leadId'])
export class AutomationExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  automationId: string;

  @Column()
  @Index()
  leadId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  executedAt: Date;
}
