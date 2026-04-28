import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
@Index('idx_audit_workspace_created', ['workspaceId', 'createdAt'])
@Index('idx_audit_resource', ['workspaceId', 'resourceType', 'resourceId'])
@Index('idx_audit_action_created', ['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  workspaceId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 80 })
  action: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  resourceType: string | null;

  @Column({ type: 'uuid', nullable: true })
  resourceId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, unknown> | null;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  requestId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
