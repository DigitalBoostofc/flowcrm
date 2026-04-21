import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, Index } from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { User } from '../../users/entities/user.entity';

export enum ActivityType {
  NOTE = 'note',
  CALL = 'call',
  WHATSAPP = 'whatsapp',
  MEETING = 'meeting',
  VISIT = 'visit',
  PROPOSAL = 'proposal',
}

@Entity('lead_activities')
export class LeadActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  @Column()
  @Index()
  leadId: string;

  @Column({ type: 'enum', enum: ActivityType, default: ActivityType.NOTE })
  type: ActivityType;

  @Column({ type: 'text' })
  body: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
