import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Contact } from '../contacts/entities/contact.entity';
import { Lead } from '../leads/entities/lead.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Contact) private contacts: Repository<Contact>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
  ) {}

  async search(q: string) {
    if (!q || q.trim().length < 2) return { contacts: [], leads: [] };
    const term = q.trim();

    const [contacts, leadsByTitle, leadsByContact] = await Promise.all([
      this.contacts.find({
        where: [{ name: ILike(`%${term}%`) }, { phone: ILike(`%${term}%`) }, { email: ILike(`%${term}%`) }],
        take: 5,
      }),
      this.leads.find({
        where: { title: ILike(`%${term}%`) },
        relations: ['contact', 'stage', 'pipeline'],
        take: 5,
      }),
      this.leads
        .createQueryBuilder('lead')
        .leftJoinAndSelect('lead.contact', 'contact')
        .leftJoinAndSelect('lead.stage', 'stage')
        .leftJoinAndSelect('lead.pipeline', 'pipeline')
        .where('contact.name ILIKE :term', { term: `%${term}%` })
        .orWhere('contact.phone ILIKE :term', { term: `%${term}%` })
        .take(5)
        .getMany(),
    ]);

    const allLeads = [...leadsByTitle, ...leadsByContact]
      .filter((l, i, arr) => arr.findIndex((x) => x.id === l.id) === i)
      .slice(0, 5);

    return { contacts, leads: allLeads };
  }
}
