import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { Plan } from './entities/plan.entity';
import { FEATURE_CATALOG, isValidFeatureKey } from './feature-catalog';

export interface PlanDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceMonthlyCents: number;
  features: string[];
  highlight: boolean;
  active: boolean;
  sortOrder: number;
  stripePriceId: string | null;
  stripeProductId: string | null;
}

export interface MeFeaturesDto {
  planSlug: string | null;
  subscriptionStatus: Workspace['subscriptionStatus'];
  features: string[];
  allUnlocked: boolean;
}

export interface CreatePlanInput {
  slug: string;
  name: string;
  description?: string;
  priceMonthlyCents: number;
  features: string[];
  highlight?: boolean;
  active?: boolean;
  sortOrder?: number;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
}

export type UpdatePlanInput = Partial<CreatePlanInput>;

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Workspace) private wsRepo: Repository<Workspace>,
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
    private readonly tenant: TenantContext,
  ) {}

  getFeatureCatalog() {
    return Object.values(FEATURE_CATALOG);
  }

  async listPlans(includeInactive = false): Promise<PlanDto[]> {
    const where = includeInactive ? {} : { active: true };
    const rows = await this.planRepo.find({ where, order: { sortOrder: 'ASC', createdAt: 'ASC' } });
    return rows.map(toDto);
  }

  async getMyFeatures(): Promise<MeFeaturesDto> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const w = await this.wsRepo.findOne({ where: { id: workspaceId } });
    if (!w) throw new NotFoundException('Workspace não encontrado');

    // Trial libera tudo
    if (w.subscriptionStatus === 'trial') {
      return {
        planSlug: w.planSlug,
        subscriptionStatus: w.subscriptionStatus,
        features: Object.keys(FEATURE_CATALOG),
        allUnlocked: true,
      };
    }

    if (!w.planSlug) {
      return {
        planSlug: null,
        subscriptionStatus: w.subscriptionStatus,
        features: [],
        allUnlocked: false,
      };
    }

    const plan = await this.planRepo.findOne({ where: { slug: w.planSlug } });
    return {
      planSlug: w.planSlug,
      subscriptionStatus: w.subscriptionStatus,
      features: plan?.features ?? [],
      allUnlocked: false,
    };
  }

  async hasFeature(featureKey: string): Promise<boolean> {
    const me = await this.getMyFeatures();
    return me.allUnlocked || me.features.includes(featureKey);
  }

  async subscribe(planSlug: string): Promise<Workspace> {
    const plan = await this.planRepo.findOne({ where: { slug: planSlug, active: true } });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.wsRepo.update(workspaceId, {
      subscriptionStatus: 'active',
      planSlug: plan.slug,
    });
    const w = await this.wsRepo.findOne({ where: { id: workspaceId } });
    if (!w) throw new NotFoundException('Workspace não encontrado');
    return w;
  }

  async cancel(): Promise<Workspace> {
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.wsRepo.update(workspaceId, { subscriptionStatus: 'canceled' });
    const w = await this.wsRepo.findOne({ where: { id: workspaceId } });
    if (!w) throw new NotFoundException('Workspace não encontrado');
    return w;
  }

  // ── Admin CRUD ──────────────────────────────────────────

  async adminListPlans(): Promise<PlanDto[]> {
    return this.listPlans(true);
  }

  async adminCreatePlan(input: CreatePlanInput): Promise<PlanDto> {
    this.validateFeatures(input.features);
    const existing = await this.planRepo.findOne({ where: { slug: input.slug } });
    if (existing) throw new ConflictException('Já existe um plano com esse slug');
    const plan = this.planRepo.create({
      slug: input.slug,
      name: input.name,
      description: input.description ?? '',
      priceMonthlyCents: input.priceMonthlyCents,
      features: input.features,
      highlight: input.highlight ?? false,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
      stripePriceId: input.stripePriceId ?? null,
      stripeProductId: input.stripeProductId ?? null,
    });
    const saved = await this.planRepo.save(plan);
    return toDto(saved);
  }

  async adminUpdatePlan(id: string, input: UpdatePlanInput): Promise<PlanDto> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    if (input.features) this.validateFeatures(input.features);
    if (input.slug && input.slug !== plan.slug) {
      const dupe = await this.planRepo.findOne({ where: { slug: input.slug } });
      if (dupe) throw new ConflictException('Já existe um plano com esse slug');
    }
    Object.assign(plan, {
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.priceMonthlyCents !== undefined && { priceMonthlyCents: input.priceMonthlyCents }),
      ...(input.features !== undefined && { features: input.features }),
      ...(input.highlight !== undefined && { highlight: input.highlight }),
      ...(input.active !== undefined && { active: input.active }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.stripePriceId !== undefined && { stripePriceId: input.stripePriceId }),
      ...(input.stripeProductId !== undefined && { stripeProductId: input.stripeProductId }),
    });
    const saved = await this.planRepo.save(plan);
    return toDto(saved);
  }

  async adminDeletePlan(id: string): Promise<void> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    const inUse = await this.wsRepo.count({ where: { planSlug: plan.slug } });
    if (inUse > 0) {
      throw new ConflictException(
        `Não é possível excluir: ${inUse} workspace(s) estão neste plano. Desative em vez de excluir.`,
      );
    }
    await this.planRepo.delete(id);
  }

  private validateFeatures(features: string[]): void {
    for (const f of features) {
      if (!isValidFeatureKey(f)) {
        throw new BadRequestException(`Feature desconhecida: ${f}`);
      }
    }
  }
}

function toDto(p: Plan): PlanDto {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    priceMonthlyCents: p.priceMonthlyCents,
    features: p.features ?? [],
    highlight: p.highlight,
    active: p.active,
    sortOrder: p.sortOrder,
    stripePriceId: p.stripePriceId,
    stripeProductId: p.stripeProductId,
  };
}
