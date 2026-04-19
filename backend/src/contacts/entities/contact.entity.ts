import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @OneToMany(() => Lead, (lead) => lead.contact)
  leads: Lead[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
