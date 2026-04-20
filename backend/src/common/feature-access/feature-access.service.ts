import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Plan } from '../../subscriptions/entities/plan.entity';

@Injectable()
export class FeatureAccessService {
  constructor(
    @InjectRepository(Workspace) private wsRepo: Repository<Workspace>,
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
  ) {}

  async workspaceHasFeature(workspaceId: string, feature: string): Promise<boolean> {
    const w = await this.wsRepo.findOne({ where: { id: workspaceId } });
    if (!w) return false;
    // Trial libera tudo
    if (w.subscriptionStatus === 'trial') return true;
    if (!w.planSlug) return false;
    const plan = await this.planRepo.findOne({ where: { slug: w.planSlug } });
    if (!plan) return false;
    return (plan.features ?? []).includes(feature);
  }
}
