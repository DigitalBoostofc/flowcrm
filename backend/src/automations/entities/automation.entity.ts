import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Index, OneToMany,
} from 'typeorm';
import { Pipeline } from '../../pipelines/entities/pipeline.entity';
import { Stage } from '../../stages/entities/stage.entity';
import { AutomationStep } from './automation-step.entity';

export type AutomationTriggerType = 'pipeline' | 'stage';

@Entity('automations')
export class Automation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  triggerType: AutomationTriggerType;

  @ManyToOne(() => Pipeline, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'pipelineId' })
  pipeline: Pipeline | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  pipelineId: string | null;

  @ManyToOne(() => Stage, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'stageId' })
  stage: Stage | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  stageId: string | null;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => AutomationStep, (s) => s.automation, { cascade: true, eager: false })
  steps: AutomationStep[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
