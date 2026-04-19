import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, Index } from 'typeorm';
import { Conversation } from '../../conversations/entities/conversation.entity';

export type MessageDirection = 'inbound' | 'outbound';
export type MessageType = 'text';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

@Entity('messages')
@Index(['conversationId', 'sentAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Conversation, (c) => c.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  conversationId: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 10 })
  direction: MessageDirection;

  @Column({ type: 'varchar', length: 10, default: 'text' })
  type: MessageType;

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: MessageStatus;

  @Column({ unique: true, nullable: true })
  externalMessageId: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
