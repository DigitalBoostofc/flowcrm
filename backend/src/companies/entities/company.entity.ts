import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum CompanyPrivacy {
  ALL = 'all',
  RESTRICTED = 'restricted',
}

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  /* ── Dados básicos ── */
  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  @Index()
  cnpj: string;

  @Column({ nullable: true })
  razaoSocial: string;

  @Column({ nullable: true })
  categoria: string;

  @Column({ nullable: true })
  origem: string;

  @Column({ nullable: true })
  setor: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsibleId' })
  responsible: User;

  @Column({ type: 'uuid', nullable: true })
  responsibleId: string;

  /* ── Privacidade ── */
  @Column({ type: 'enum', enum: CompanyPrivacy, default: CompanyPrivacy.ALL })
  privacy: CompanyPrivacy;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  additionalAccessUserIds: string[];

  /* ── Contato ── */
  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  whatsapp: string;

  @Column({ nullable: true })
  telefone: string;

  @Column({ nullable: true })
  celular: string;

  @Column({ nullable: true })
  fax: string;

  @Column({ nullable: true })
  ramal: string;

  @Column({ nullable: true })
  website: string;

  /* ── Endereço ── */
  @Column({ nullable: true })
  cep: string;

  @Column({ nullable: true, default: 'Brasil' })
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

  /* ── Produtos e pessoas ── */
  @Column({ type: 'jsonb', default: () => `'[]'` })
  produtos: string[];

  @Column({ type: 'jsonb', default: () => `'[]'` })
  pessoaIds: string[];

  /* ── Redes sociais ── */
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

  /* ── Misc ── */
  @Column({ type: 'int', nullable: true })
  ranking: number;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatarKey: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
