import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type RequiredFieldTarget = 'lead' | 'company' | 'contact';

@Entity('stage_required_fields')
@Index(['stageId'])
export class StageRequiredField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  stageId: string;

  @Column({ type: 'varchar', length: 20 })
  targetType: RequiredFieldTarget;

  @Column({ type: 'varchar', length: 80 })
  fieldKey: string;

  @Column({ type: 'text', nullable: true })
  question: string | null;

  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn()
  createdAt: Date;
}
