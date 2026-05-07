import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToMany, Index,
} from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { Conversation } from '../../conversations/entities/conversation.entity';

@Entity('labels')
export class Label {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  workspaceId: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  color: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToMany(() => Lead, (lead) => lead.labels)
  leads: Lead[];

  @ManyToMany(() => Conversation, (conv) => conv.labels)
  conversations: Conversation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
