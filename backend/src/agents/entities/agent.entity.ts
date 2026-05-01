import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  DeleteDateColumn, Index,
} from 'typeorm';

export type AgentPersona = 'formal' | 'proxima' | 'divertida';

export interface ActivationRules {
  afterHours?: boolean;
  weekends?: boolean;
  unassigned?: boolean;
  always?: boolean;
}

export interface ConversationFlowStep {
  id: string;
  order: number;
  name: string;
  goal: string;
  completionCriteria: string;
  pipelineStageId?: string | null;
}

export interface AgentConfig {
  enabledChannels: string[];
  activationRules: ActivationRules;
  allowedTools: string[];
  escalationKeywords: string[];
  maxMessagesPerConv: number;
  cooldownSeconds: number;
  defaultPipelineB2C?: string | null;
  defaultPipelineB2B?: string | null;
  initialDisclaimer?: string | null;
  conversationFlow?: ConversationFlowStep[];
}

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  workspaceId: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'proxima' })
  persona: AgentPersona;

  @Column({ type: 'varchar', length: 60, default: 'claude-haiku-4-5' })
  model: string;

  @Column({ type: 'text', default: '' })
  systemPrompt: string;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  config: AgentConfig;

  @Column({ type: 'boolean', default: false })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
