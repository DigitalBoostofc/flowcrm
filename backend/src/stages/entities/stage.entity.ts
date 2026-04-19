import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { Pipeline } from '../../pipelines/entities/pipeline.entity';
import { Lead } from '../../leads/entities/lead.entity';

@Entity('stages')
export class Stage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  position: number;

  @Column({ default: '#3b82f6' })
  color: string;

  @Column({ type: 'int', nullable: true })
  timeLimitDays: number | null;

  @ManyToOne(() => Pipeline, (pipeline) => pipeline.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipelineId' })
  pipeline: Pipeline;

  @Column()
  pipelineId: string;

  @OneToMany(() => Lead, (lead) => lead.stage)
  leads: Lead[];

  @CreateDateColumn()
  createdAt: Date;
}
