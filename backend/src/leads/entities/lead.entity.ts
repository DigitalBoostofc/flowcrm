import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';
import { Company } from '../../companies/entities/company.entity';
import { Stage } from '../../stages/entities/stage.entity';
import { Pipeline } from '../../pipelines/entities/pipeline.entity';
import { User } from '../../users/entities/user.entity';

export enum LeadStatus {
  ACTIVE = 'active',
  WON = 'won',
  LOST = 'lost',
}

export enum LeadPrivacy {
  ALL = 'all',
  RESTRICTED = 'restricted',
}

export interface LeadItem {
  productName: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType: 'value' | 'percent';
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Contact, (contact) => contact.leads, { nullable: true })
  @JoinColumn({ name: 'contactId' })
  contact: Contact | null;

  @Column({ nullable: true })
  contactId: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'companyId' })
  company: Company | null;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

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

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  createdById: string;

  @Column({ type: 'int', nullable: true })
  ranking: number;

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

  @Column({ type: 'enum', enum: LeadPrivacy, default: LeadPrivacy.ALL })
  privacy: LeadPrivacy;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  additionalAccessUserIds: string[];

  @Column({ type: 'jsonb', default: () => `'[]'` })
  items: LeadItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
