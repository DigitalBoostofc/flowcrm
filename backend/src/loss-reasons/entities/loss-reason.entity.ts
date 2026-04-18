import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('loss_reasons')
export class LossReason {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  label: string;

  @CreateDateColumn()
  createdAt: Date;
}
