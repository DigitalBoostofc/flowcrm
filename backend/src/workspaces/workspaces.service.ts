import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './entities/workspace.entity';

export interface WorkspaceWithTrial extends Workspace {
  trialDaysLeft: number;
  isBlocked: boolean;
}

@Injectable()
export class WorkspacesService {
  constructor(@InjectRepository(Workspace) private repo: Repository<Workspace>) {}

  async findOne(id: string): Promise<Workspace> {
    const w = await this.repo.findOne({ where: { id } });
    if (!w) throw new NotFoundException('Workspace não encontrado');
    return w;
  }

  async findOneWithTrial(id: string): Promise<WorkspaceWithTrial> {
    let w = await this.findOne(id);
    const now = Date.now();
    const endMs = new Date(w.trialEndsAt).getTime();
    if (w.subscriptionStatus === 'trial' && endMs < now) {
      await this.repo.update(id, { subscriptionStatus: 'expired' });
      w = await this.findOne(id);
    }
    const trialDaysLeft =
      w.subscriptionStatus === 'trial'
        ? Math.max(0, Math.ceil((endMs - now) / 86_400_000))
        : 0;
    const isBlocked = w.subscriptionStatus === 'expired' || w.subscriptionStatus === 'canceled';
    return Object.assign(w, { trialDaysLeft, isBlocked });
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
