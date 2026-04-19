import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TaskType {
  EMAIL = 'email',
  CALL = 'call',
  WHATSAPP = 'whatsapp',
  PROPOSAL = 'proposal',
  MEETING = 'meeting',
  VISIT = 'visit',
}

export enum TaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export enum TaskTargetType {
  CONTACT = 'contact',
  LEAD = 'lead',
  COMPANY = 'company',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'enum', enum: TaskType })
  @Index()
  type: TaskType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'timestamptz', nullable: true })
  @Index()
  dueDate: Date | null;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  @Index()
  status: TaskStatus;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  responsibleIds: string[];

  @Column({ type: 'enum', enum: TaskTargetType, nullable: true })
  targetType: TaskTargetType | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  targetId: string | null;

  @Column({ type: 'varchar', nullable: true })
  targetLabel: string | null;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  attachments: { name: string; url: string }[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  googleEventIds: Record<string, string>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
