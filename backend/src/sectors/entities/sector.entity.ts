import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('sectors')
@Unique(['workspaceId', 'name'])
export class Sector {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column({ length: 120 })
  name: string;

  @CreateDateColumn()
  createdAt: Date;
}
