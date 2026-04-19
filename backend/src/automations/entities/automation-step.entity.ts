import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index,
} from 'typeorm';
import { Automation } from './automation.entity';

export type AutomationStepType = 'wait' | 'filter' | 'send_whatsapp';

export interface WaitStepConfig {
  amount: number;
  unit: 'minutes' | 'hours' | 'days';
}

export interface FilterCondition {
  target: 'lead' | 'contact' | 'company';
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'not_contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'empty' | 'not_empty';
  value?: string | number;
}

export interface FilterStepConfig {
  logic: 'and' | 'or';
  conditions: FilterCondition[];
}

export interface SendWhatsappStepConfig {
  channelId: string;
  templateId: string;
}

export type AutomationStepConfig =
  | WaitStepConfig
  | FilterStepConfig
  | SendWhatsappStepConfig
  | Record<string, unknown>;

@Entity('automation_steps')
export class AutomationStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Automation, (a) => a.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'automationId' })
  automation: Automation;

  @Column({ type: 'uuid' })
  @Index()
  automationId: string;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'varchar', length: 30 })
  type: AutomationStepType;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  config: AutomationStepConfig;

  @CreateDateColumn()
  createdAt: Date;
}
