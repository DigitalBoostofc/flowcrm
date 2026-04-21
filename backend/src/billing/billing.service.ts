import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Plan } from '../subscriptions/entities/plan.entity';
import { User } from '../users/entities/user.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { STRIPE_CLIENT, StripeClient } from './stripe.provider';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: StripeClient | null,
    @InjectRepository(Workspace) private readonly wsRepo: Repository<Workspace>,
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly tenant: TenantContext,
    private readonly config: ConfigService,
  ) {}

  isEnabled(): boolean {
    return this.stripe !== null;
  }

  private requireStripe(): StripeClient {
    if (!this.stripe) {
      throw new InternalServerErrorException('Stripe não configurado no servidor');
    }
    return this.stripe;
  }

  private appUrl(): string {
    return (
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('APP_URL') ||
      'http://localhost:5173'
    );
  }

  async ensureCustomer(workspace: Workspace): Promise<string> {
    if (workspace.stripeCustomerId) return workspace.stripeCustomerId;
    const stripe = this.requireStripe();
    const owner = workspace.ownerUserId
      ? await this.userRepo.findOne({ where: { id: workspace.ownerUserId } })
      : null;
    const customer = await stripe.customers.create({
      name: workspace.name,
      email: owner?.email ?? undefined,
      metadata: { workspaceId: workspace.id },
    });
    await this.wsRepo.update(workspace.id, { stripeCustomerId: customer.id });
    workspace.stripeCustomerId = customer.id;
    return customer.id;
  }

  async createCheckoutSession(planSlug: string): Promise<{ url: string }> {
    const stripe = this.requireStripe();
    const workspaceId = this.tenant.requireWorkspaceId();
    const workspace = await this.wsRepo.findOne({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace não encontrado');

    const plan = await this.planRepo.findOne({ where: { slug: planSlug, active: true } });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    if (!plan.stripePriceId) {
      throw new BadRequestException('Plano sem Stripe Price ID configurado');
    }

    const customerId = await this.ensureCustomer(workspace);
    const base = this.appUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: workspace.id,
      metadata: { workspaceId: workspace.id, planSlug: plan.slug },
      subscription_data: {
        metadata: { workspaceId: workspace.id, planSlug: plan.slug },
      },
      success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/billing/cancel`,
    });

    if (!session.url) {
      throw new InternalServerErrorException('Stripe não retornou URL de checkout');
    }
    return { url: session.url };
  }

  async createPortalSession(): Promise<{ url: string }> {
    const stripe = this.requireStripe();
    const workspaceId = this.tenant.requireWorkspaceId();
    const workspace = await this.wsRepo.findOne({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace não encontrado');
    if (!workspace.stripeCustomerId) {
      throw new BadRequestException('Workspace ainda não tem assinatura ativa');
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeCustomerId,
      return_url: `${this.appUrl()}/settings?tab=sistema`,
    });
    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const stripe = this.requireStripe();
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new InternalServerErrorException('STRIPE_WEBHOOK_SECRET não configurado');

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      this.logger.error(`Falha ao validar assinatura do webhook: ${(err as Error).message}`);
      throw new BadRequestException('Assinatura inválida');
    }

    const already = await this.wsRepo.query(
      `SELECT id FROM "stripe_webhook_events" WHERE id = $1 LIMIT 1`,
      [event.id],
    );
    if (already.length > 0) {
      this.logger.log(`Evento já processado, ignorando: ${event.id}`);
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.onCheckoutCompleted(event.data.object);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.onSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.onSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.onPaymentFailed(event.data.object);
          break;
        default:
          this.logger.debug(`Evento não tratado: ${event.type}`);
      }
    } catch (err) {
      this.logger.error(`Erro processando webhook ${event.type}: ${(err as Error).message}`);
      throw err;
    }

    await this.wsRepo.query(
      `INSERT INTO "stripe_webhook_events" (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [event.id, event.type],
    );
  }

  private async onCheckoutCompleted(session: any): Promise<void> {
    const workspaceId = session.metadata?.workspaceId ?? session.client_reference_id ?? null;
    const planSlug = session.metadata?.planSlug ?? null;
    if (!workspaceId) {
      this.logger.warn('checkout.session.completed sem workspaceId');
      return;
    }
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;

    await this.wsRepo.update(workspaceId, {
      stripeCustomerId: customerId ?? undefined,
      stripeSubscriptionId: subscriptionId ?? undefined,
      planSlug: planSlug ?? undefined,
      subscriptionStatus: 'active',
    });
  }

  private async onSubscriptionUpdated(sub: any): Promise<void> {
    const workspaceId = sub.metadata?.workspaceId ?? null;
    const ws = workspaceId
      ? await this.wsRepo.findOne({ where: { id: workspaceId } })
      : await this.wsRepo.findOne({ where: { stripeSubscriptionId: sub.id } });
    if (!ws) {
      this.logger.warn(`Subscription ${sub.id} sem workspace correspondente`);
      return;
    }

    const priceId = sub.items?.data?.[0]?.price?.id ?? null;
    let planSlug = sub.metadata?.planSlug ?? ws.planSlug;
    if (priceId) {
      const matched = await this.planRepo.findOne({ where: { stripePriceId: priceId } });
      if (matched) planSlug = matched.slug;
    }

    const statusMap: Record<string, Workspace['subscriptionStatus']> = {
      active: 'active',
      trialing: 'active',
      past_due: 'active',
      canceled: 'canceled',
      incomplete: 'expired',
      incomplete_expired: 'expired',
      unpaid: 'expired',
      paused: 'expired',
    };
    const nextStatus = statusMap[sub.status] ?? ws.subscriptionStatus;

    await this.wsRepo.update(ws.id, {
      stripeSubscriptionId: sub.id,
      planSlug: planSlug ?? undefined,
      subscriptionStatus: nextStatus,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    });
  }

  private async onSubscriptionDeleted(sub: any): Promise<void> {
    const ws = await this.wsRepo.findOne({ where: { stripeSubscriptionId: sub.id } });
    if (!ws) return;
    await this.wsRepo.update(ws.id, {
      subscriptionStatus: 'canceled',
      cancelAtPeriodEnd: false,
    });
  }

  private async onPaymentFailed(invoice: any): Promise<void> {
    const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
    if (!subId) return;
    const ws = await this.wsRepo.findOne({ where: { stripeSubscriptionId: subId } });
    if (!ws) return;
    this.logger.warn(`Pagamento falhou para workspace ${ws.id} (invoice ${invoice.id})`);
  }

  async getMyBilling(): Promise<{
    enabled: boolean;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    subscriptionStatus: Workspace['subscriptionStatus'];
    planSlug: string | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  }> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const ws = await this.wsRepo.findOne({ where: { id: workspaceId } });
    if (!ws) throw new NotFoundException('Workspace não encontrado');
    return {
      enabled: this.isEnabled(),
      stripeCustomerId: ws.stripeCustomerId,
      stripeSubscriptionId: ws.stripeSubscriptionId,
      subscriptionStatus: ws.subscriptionStatus,
      planSlug: ws.planSlug,
      currentPeriodEnd: ws.currentPeriodEnd,
      cancelAtPeriodEnd: ws.cancelAtPeriodEnd,
    };
  }
}
