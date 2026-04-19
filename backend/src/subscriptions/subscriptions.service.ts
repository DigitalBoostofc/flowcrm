import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

export interface Plan {
  id: string;
  name: string;
  priceMonthlyCents: number;
  features: string[];
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthlyCents: 9700,
    features: [
      '1 canal WhatsApp',
      'Até 3 agentes',
      'Funis e automações ilimitadas',
      'Relatórios básicos',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthlyCents: 19700,
    features: [
      '3 canais WhatsApp',
      'Agentes ilimitados',
      'Funis e automações ilimitadas',
      'Relatórios avançados',
      'Integrações (Google Calendar, webhooks)',
    ],
    highlight: true,
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthlyCents: 39700,
    features: [
      'Canais WhatsApp ilimitados',
      'Agentes ilimitados',
      'Suporte prioritário',
      'Onboarding dedicado',
      'SLA garantido',
    ],
  },
];

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Workspace) private wsRepo: Repository<Workspace>,
    private readonly tenant: TenantContext,
  ) {}

  listPlans(): Plan[] {
    return PLANS;
  }

  async subscribe(planId: string): Promise<Workspace> {
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) throw new NotFoundException('Plano não encontrado');
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.wsRepo.update(workspaceId, { subscriptionStatus: 'active' });
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
}
