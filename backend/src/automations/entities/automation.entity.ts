import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index, Unique } from 'typeorm';
import { Stage } from '../../stages/entities/stage.entity';
import { MessageTemplate } from '../../templates/entities/template.entity';

@Entity('automations')
@Unique(['stageId'])
export class Automation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Stage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stageId' })
  stage: Stage;

  @Column()
  @Index()
  stageId: string;

  @Column({ type: 'int', default: 0 })
  delayMinutes: number;

  @Column({ type: 'varchar', length: 20 })
  channelType: string;

  @Column()
  channelConfigId: string;

  @ManyToOne(() => MessageTemplate)
  @JoinColumn({ name: 'templateId' })
  template: MessageTemplate;

  @Column()
  templateId: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
