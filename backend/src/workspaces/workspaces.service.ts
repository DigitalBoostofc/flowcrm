import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './entities/workspace.entity';

@Injectable()
export class WorkspacesService {
  constructor(@InjectRepository(Workspace) private repo: Repository<Workspace>) {}

  async findOne(id: string): Promise<Workspace> {
    const w = await this.repo.findOne({ where: { id } });
    if (!w) throw new NotFoundException('Workspace não encontrado');
    return w;
  }

  async create(data: {
    name: string;
    ownerUserId?: string | null;
    trialDays?: number;
  }): Promise<Workspace> {
    const days = data.trialDays ?? 7;
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(trialStartedAt.getTime() + days * 24 * 60 * 60 * 1000);
    const w = this.repo.create({
      name: data.name,
      ownerUserId: data.ownerUserId ?? null,
      trialStartedAt,
      trialEndsAt,
      subscriptionStatus: 'trial',
    });
    return this.repo.save(w);
  }

  async updateOwner(id: string, ownerUserId: string): Promise<void> {
    await this.repo.update(id, { ownerUserId });
  }

  async updateSubscription(
    id: string,
    status: Workspace['subscriptionStatus'],
  ): Promise<Workspace> {
    await this.repo.update(id, { subscriptionStatus: status });
    return this.findOne(id);
  }
}
