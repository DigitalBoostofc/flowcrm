import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToMany, JoinTable, Index,
} from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';

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

  @ManyToMany(() => Lead, (lead) => lead.labels)
  leads: Lead[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
