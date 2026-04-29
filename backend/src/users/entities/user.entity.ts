import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Lead } from '../../leads/entities/lead.entity';

export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  SELLER = 'seller',
  AGENT = 'agent',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Exclude()
  @Column()
  passwordHash: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ default: false })
  phoneVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatarKey: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.AGENT })
  role: UserRole;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => Lead, (lead) => lead.assignedTo)
  leads: Lead[];

  /**
   * Set when the user requested account deletion via DELETE /api/me/account.
   * The actual erase happens via cron once now() > scheduledDeletionAt.
   * While set, login is blocked unless the user calls /api/me/account/restore.
   */
  @Column({ type: 'timestamptz', nullable: true })
  scheduledDeletionAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
