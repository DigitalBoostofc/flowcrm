import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type ChannelType = 'evolution' | 'uazapi' | 'meta' | 'telegram';
export type ChannelStatus = 'connected' | 'disconnected' | 'error';

@Entity('channel_configs')
export class ChannelConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  type: ChannelType;

  @Column({ type: 'jsonb' })
  config: Record<string, string>;

  @Column({ type: 'varchar', length: 20, default: 'disconnected' })
  status: ChannelStatus;

  @Column({ default: true })
  @Index()
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
