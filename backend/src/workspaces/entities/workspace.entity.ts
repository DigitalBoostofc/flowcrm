import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled';

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerUserId' })
  owner: User | null;

  @Column({ type: 'uuid', nullable: true })
  ownerUserId: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  trialStartedAt: Date;

  @Column({ type: 'timestamptz' })
  trialEndsAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'trial' })
  subscriptionStatus: SubscriptionStatus;

  @Column({ type: 'varchar', length: 40, nullable: true })
  planSlug: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  stripeCustomerId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  stripeSubscriptionId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodEnd: Date | null;

  @Column({ type: 'boolean', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ type: 'varchar', length: 20, default: 'all' })
  defaultLeadPrivacy: 'all' | 'restricted';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
