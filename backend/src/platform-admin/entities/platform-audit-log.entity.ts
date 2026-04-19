import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('platform_audit_logs')
export class PlatformAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 320 })
  @Index()
  actorEmail: string;

  @Column({ type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'varchar', length: 60 })
  @Index()
  action: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  targetWorkspaceId: string | null;

  @Column({ type: 'uuid', nullable: true })
  targetUserId: string | null;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
