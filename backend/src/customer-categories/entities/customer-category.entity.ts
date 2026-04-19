import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('customer_categories')
@Unique(['workspaceId', 'name'])
export class CustomerCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column({ length: 120 })
  name: string;

  @CreateDateColumn()
  createdAt: Date;
}
