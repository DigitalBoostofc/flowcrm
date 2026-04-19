import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('app_settings')
export class AppSetting {
  @PrimaryColumn({ type: 'varchar', length: 20, default: 'singleton' })
  id: string;

  @Column({ type: 'uuid', nullable: true })
  systemChannelConfigId: string | null;

  @Column({ type: 'boolean', default: true })
  signupEnabled: boolean;

  @Column({ type: 'int', default: 7 })
  trialDays: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
