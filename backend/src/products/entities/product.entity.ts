import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

export type ProductType = 'produto' | 'servico';

@Entity('products')
@Unique(['workspaceId', 'name'])
@Index(['workspaceId'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'produto' })
  type: ProductType;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  price: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
