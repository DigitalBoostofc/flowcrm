import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Conversation } from '../../conversations/entities/conversation.entity';
import { User } from '../../users/entities/user.entity';

export type ScheduledStatus = 'pending' | 'sent' | 'cancelled' | 'failed';

@Entity('scheduled_messages')
@Index(['status', 'scheduledAt'])
export class ScheduledMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  conversationId: string;

  @Column({ type: 'text' })
  body: string;

  @Column()
  channelConfigId: string;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ScheduledStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @Column({ nullable: true })
  bullJobId: string;

  @CreateDateColumn()
  createdAt: Date;
}
