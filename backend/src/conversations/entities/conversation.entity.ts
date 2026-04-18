import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn, Index, Unique } from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { Message } from '../../messages/entities/message.entity';

@Entity('conversations')
@Unique(['leadId', 'channelType'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lead)
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  @Column()
  @Index()
  leadId: string;

  @Column()
  channelType: string;

  @Column({ nullable: true })
  externalId: string;

  @OneToMany(() => Message, (m) => m.conversation)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
