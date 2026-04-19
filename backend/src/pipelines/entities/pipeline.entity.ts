import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Stage } from '../../stages/entities/stage.entity';

export type PipelineKind = 'sale' | 'management';

@Entity('pipelines')
export class Pipeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  sigla: string | null;

  @Column({ default: false })
  isDefault: boolean;

  /** 'sale' = funil de vendas (conta no Analytics) | 'management' = gestão estilo Trello */
  @Column({ type: 'varchar', length: 20, default: 'sale' })
  kind: PipelineKind;

  @OneToMany(() => Stage, (stage) => stage.pipeline, { cascade: true })
  stages: Stage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
