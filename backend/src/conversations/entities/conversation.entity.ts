import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, ManyToMany,
  JoinTable, CreateDateColumn, UpdateDateColumn, JoinColumn, Index,
} from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { Message } from '../../messages/entities/message.entity';
import { Label } from '../../labels/entities/label.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Lead, { nullable: true })
  @JoinColumn({ name: 'leadId' })
  lead: Lead | null;

  @Column({ nullable: true })
  @Index()
  leadId: string | null;

  @Column()
  channelType: string;

  @Column({ nullable: true })
  externalId: string;

  @Column({ type: 'varchar', nullable: true })
  fromName: string | null;

  @Column({ type: 'text', nullable: true })
  fromAvatarUrl: string | null;

  @OneToMany(() => Message, (m) => m.conversation)
  messages: Message[];

  @Column({ type: 'timestamptz', nullable: true })
  lastReadAt: Date | null;

  @ManyToMany(() => Label, (label) => label.conversations)
  @JoinTable({
    name: 'conversation_labels',
    joinColumn: { name: 'conversationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'labelId', referencedColumnName: 'id' },
  })
  labels: Label[];

  @Column({ type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
