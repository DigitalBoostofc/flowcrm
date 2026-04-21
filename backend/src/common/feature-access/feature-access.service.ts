import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Plan } from '../../subscriptions/entities/plan.entity';

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  features: string[];
  status: string;
  expiresAt: number;
}

@Injectable()
export class FeatureAccessService {
  private cache = new Map<string, CacheEntry>();

  constructor(
    @InjectRepository(Workspace) private wsRepo: Repository<Workspace>,
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
  ) {}

  invalidate(workspaceId: string): void {
    this.cache.delete(workspaceId);
  }

  async workspaceHasFeature(workspaceId: string, feature: string): Promise<boolean> {
    const cached = this.cache.get(workspaceId);
    if (cached && cached.expiresAt > Date.now()) {
      if (cached.status === 'trial') return true;
      return cached.features.includes(feature);
    }

    const w = await this.wsRepo.findOne({ where: { id: workspaceId } });
    if (!w) return false;

    let features: string[] = [];
    if (w.subscriptionStatus !== 'trial' && w.planSlug) {
      const plan = await this.planRepo.findOne({ where: { slug: w.planSlug } });
      features = plan?.features ?? [];
    }

    this.cache.set(workspaceId, { features, status: w.subscriptionStatus, expiresAt: Date.now() + CACHE_TTL_MS });

    if (w.subscriptionStatus === 'trial') return true;
    return features.includes(feature);
  }
}
