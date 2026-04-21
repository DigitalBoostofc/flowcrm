import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, Index } from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

export enum ContactActivityType {
  NOTE     = 'note',
  EMAIL    = 'email',
  CALL     = 'call',
  WHATSAPP = 'whatsapp',
  MEETING  = 'meeting',
  VISIT    = 'visit',
  PROPOSAL = 'proposal',
}

@Entity('contact_activities')
export class ContactActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact | null;

  @Column({ nullable: true })
  @Index()
  contactId: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company | null;

  @Column({ nullable: true })
  @Index()
  companyId: string | null;

  @Column({ type: 'enum', enum: ContactActivityType, default: ContactActivityType.NOTE })
  type: ContactActivityType;

  @Column({ type: 'text' })
  body: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
