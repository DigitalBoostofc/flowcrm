import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('customer_origins')
@Unique(['workspaceId', 'name'])
export class CustomerOrigin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column({ length: 120 })
  name: string;

  @CreateDateColumn()
  createdAt: Date;
}
