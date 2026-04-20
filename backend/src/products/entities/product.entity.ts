import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ProductType = 'produto' | 'servico';
export type ProductAppliesTo = 'pessoa' | 'empresa' | 'ambos';
export type ProductClientType = 'contact' | 'company' | null;

@Entity('products')
@Index(['workspaceId'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  /** Nome do produto ou serviço */
  @Column({ length: 150 })
  name: string;

  /** Cliente vinculado (empresa ou pessoa) */
  @Column({ type: 'uuid', nullable: true })
  clientId: string | null;

  /** Tipo do cliente: 'contact' | 'company' | null */
  @Column({ type: 'varchar', length: 20, nullable: true })
  clientType: ProductClientType;

  /** Nome do cliente (desnormalizado para exibição rápida) */
  @Column({ type: 'varchar', length: 200, nullable: true })
  clientName: string | null;

  @Column({ type: 'varchar', length: 20, default: 'produto' })
  type: ProductType;

  @Column({ type: 'varchar', length: 20, default: 'ambos' })
  appliesTo: ProductAppliesTo;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  price: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
