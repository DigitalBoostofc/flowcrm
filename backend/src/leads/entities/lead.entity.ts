import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';
import { Stage } from '../../stages/entities/stage.entity';
import { Pipeline } from '../../pipelines/entities/pipeline.entity';
import { User } from '../../users/entities/user.entity';

export enum LeadStatus {
  ACTIVE = 'active',
  WON = 'won',
  LOST = 'lost',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Contact, (contact) => contact.leads)
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column()
  contactId: string;

  @ManyToOne(() => Stage, (stage) => stage.leads)
  @JoinColumn({ name: 'stageId' })
  stage: Stage;

  @Column()
  stageId: string;

  @ManyToOne(() => Pipeline)
  @JoinColumn({ name: 'pipelineId' })
  pipeline: Pipeline;

  @Column()
  pipelineId: string;

  @ManyToOne(() => User, (user) => user.leads, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  @Column({ nullable: true })
  assignedToId: string;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.ACTIVE })
  status: LeadStatus;

  @Column({ nullable: true })
  lossReason: string;

  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  conclusionDate: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  stageEnteredAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  value: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
