import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';
import { Stage } from '../../stages/entities/stage.entity';
import { Pipeline } from '../../pipelines/entities/pipeline.entity';
import { User } from '../../users/entities/user.entity';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Contact, (contact) => contact.leads)
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column()
  contactId: string;

  @ManyToOne(() => Stage, (stage) => stage.leads)
  @JoinColumn({ name: 'stageId' })
  stage: Stage;

  @Column()
  stageId: string;

  @ManyToOne(() => Pipeline)
  @JoinColumn({ name: 'pipelineId' })
  pipeline: Pipeline;

  @Column()
  pipelineId: string;

  @ManyToOne(() => User, (user) => user.leads, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  @Column({ nullable: true })
  assignedToId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  value: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
