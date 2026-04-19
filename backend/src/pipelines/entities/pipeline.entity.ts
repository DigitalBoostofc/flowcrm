import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Stage } from '../../stages/entities/stage.entity';

@Entity('pipelines')
export class Pipeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  sigla: string | null;

  @Column({ default: false })
  isDefault: boolean;

  @OneToMany(() => Stage, (stage) => stage.pipeline, { cascade: true })
  stages: Stage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
