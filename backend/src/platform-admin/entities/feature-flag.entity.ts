import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('feature_flags')
@Unique(['key', 'workspaceId'])
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  @Index()
  key: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  workspaceId: string | null;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
