import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('loss_reasons')
@Unique(['workspaceId', 'label'])
export class LossReason {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column({ length: 100 })
  label: string;

  @CreateDateColumn()
  createdAt: Date;
}
