import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';

export enum ContactPrivacy {
  ALL = 'all',
  RESTRICTED = 'restricted',
}

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  channelOrigin: string;

  @Column({ nullable: true })
  origin: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  role: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  zipCode: string;

  @Column({ nullable: true })
  categoria: string;

  @Column({ type: 'uuid', nullable: true })
  responsibleId: string;

  @Column({ nullable: true })
  cpf: string;

  @Column({ nullable: true })
  birthDay: string;

  @Column({ type: 'int', nullable: true })
  birthYear: number;

  @Column({ nullable: true })
  origem: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ nullable: true })
  whatsapp: string;

  @Column({ nullable: true })
  celular: string;

  @Column({ nullable: true })
  fax: string;

  @Column({ nullable: true })
  ramal: string;

  @Column({ nullable: true })
  pais: string;

  @Column({ nullable: true })
  estado: string;

  @Column({ nullable: true })
  cidade: string;

  @Column({ nullable: true })
  bairro: string;

  @Column({ nullable: true })
  rua: string;

  @Column({ nullable: true })
  numero: string;

  @Column({ nullable: true })
  complemento: string;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  produtos: string[];

  @Column({ nullable: true })
  facebook: string;

  @Column({ nullable: true })
  twitter: string;

  @Column({ nullable: true })
  linkedin: string;

  @Column({ nullable: true })
  skype: string;

  @Column({ nullable: true })
  instagram: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatarKey: string | null;

  @Column({ type: 'enum', enum: ContactPrivacy, default: ContactPrivacy.ALL })
  privacy: ContactPrivacy;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  additionalAccessUserIds: string[];

  @OneToMany(() => Lead, (lead) => lead.contact)
  leads: Lead[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
