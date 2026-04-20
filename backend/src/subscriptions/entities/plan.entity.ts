import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  @Index()
  slug: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'int', default: 0 })
  priceMonthlyCents: number;

  @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
  features: string[];

  @Column({ type: 'boolean', default: false })
  highlight: boolean;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
