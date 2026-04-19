import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type OtpPurpose = 'signup';

@Entity('otp_verifications')
export class OtpVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30 })
  @Index()
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  codeHash: string;

  @Column({ type: 'varchar', length: 30 })
  purpose: OtpPurpose;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  payload: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz' })
  @Index()
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
