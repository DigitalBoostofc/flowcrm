import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, Index } from 'typeorm';
import { Conversation } from '../../conversations/entities/conversation.entity';

export type MessageDirection = 'inbound' | 'outbound';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'reaction' | 'deleted';
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

  @Column({ type: 'varchar', length: 20, default: 'text' })
  type: MessageType;

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: MessageStatus;

  @Column({ unique: true, nullable: true })
  externalMessageId: string;

  @Column({ type: 'text', nullable: true })
  mediaUrl: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mediaMimeType: string | null;

  @Column({ type: 'text', nullable: true })
  mediaCaption: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mediaFileName: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  reaction: string | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
