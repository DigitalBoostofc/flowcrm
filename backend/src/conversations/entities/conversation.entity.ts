import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn, Index } from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { Message } from '../../messages/entities/message.entity';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
