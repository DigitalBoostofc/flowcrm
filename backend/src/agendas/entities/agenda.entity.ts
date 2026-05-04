import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Appointment } from './appointment.entity';

export interface TimeBlock {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface WorkingHours {
  mon: TimeBlock[];
  tue: TimeBlock[];
  wed: TimeBlock[];
  thu: TimeBlock[];
  fri: TimeBlock[];
  sat: TimeBlock[];
  sun: TimeBlock[];
  slot_duration_min: number;
  timezone: string;
}

@Entity('agendas')
export class Agenda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  workspaceId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  ownerId: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  ownerName: string | null;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  services: string[];

  @Column({ type: 'jsonb', nullable: true })
  workingHours: WorkingHours | null;

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @OneToMany(() => Appointment, (a) => a.agenda)
  appointments: Appointment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
