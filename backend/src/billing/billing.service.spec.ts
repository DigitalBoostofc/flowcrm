import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { STRIPE_CLIENT } from './stripe.provider';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Plan } from '../subscriptions/entities/plan.entity';
import { User } from '../users/entities/user.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

const wsBase = (over: Partial<Workspace> = {}): Workspace =>
  ({
    id: 'ws-1',
    name: 'Test WS',
    ownerUserId: 'user-1',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    planSlug: null,
    subscriptionStatus: 'trial',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    ...over,
  }) as Workspace;

const planBase = (over: Partial<Plan> = {}): Plan =>
  ({
    id: 'plan-1',
    slug: 'pro',
    active: true,
    stripePriceId: 'price_123',
    ...over,
  }) as Plan;

describe('BillingService', () => {
  let service: BillingService;

  const mockStripe = {
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };

  const mockWsRepo = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(),
  };
  const mockPlanRepo = {
    findOne: jest.fn(),
  };
  const mockUserRepo = {
    findOne: jest.fn(),
  };
  const mockTenant = {
    requireWorkspaceId: jest.fn().mockReturnValue('ws-1'),
  } as unknown as TenantContext;
  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'FRONTEND_URL') return 'https://app.test';
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
      return undefined;
    }),
  } as unknown as ConfigService;

  async function build(stripeOverride: any = mockStripe): Promise<void> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: STRIPE_CLIENT, useValue: stripeOverride },
        { provide: getRepositoryToken(Workspace), useValue: mockWsRepo },
        { provide: getRepositoryToken(Plan), useValue: mockPlanRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: TenantContext, useValue: mockTenant },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(BillingService);
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    await build();
  });

  describe('isEnabled', () => {
    it('returns true when stripe client is provided', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('returns false when stripe is null', async () => {
      await build(null);
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('createCheckoutSession (stripe disabled)', () => {
    it('throws InternalServerError when stripe is null', async () => {
      await build(null);
      await expect(service.createCheckoutSession('pro')).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('ensureCustomer', () => {
    it('returns existing customer id when retrieve succeeds', async () => {
      const ws = wsBase({ stripeCustomerId: 'cus_existing' });
      mockStripe.customers.retrieve.mockResolvedValueOnce({ id: 'cus_existing', deleted: false });

      const id = await service.ensureCustomer(ws);

      expect(id).toBe('cus_existing');
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
    });

    it('recreates customer when Stripe returns resource_missing', async () => {
      const ws = wsBase({ stripeCustomerId: 'cus_dead' });
      mockStripe.customers.retrieve.mockRejectedValueOnce({ code: 'resource_missing' });
      mockUserRepo.findOne.mockResolvedValueOnce({ id: 'user-1', email: 'owner@x.com' });
      mockStripe.customers.create.mockResolvedValueOnce({ id: 'cus_new' });

      const id = await service.ensureCustomer(ws);

      expect(id).toBe('cus_new');
      expect(mockWsRepo.update).toHaveBeenCalledWith('ws-1', { stripeCustomerId: null, stripeSubscriptionId: null });
      expect(mockWsRepo.update).toHaveBeenCalledWith('ws-1', { stripeCustomerId: 'cus_new' });
    });

    it('rethrows non-resource_missing errors from retrieve', async () => {
      const ws = wsBase({ stripeCustomerId: 'cus_existing' });
      const otherErr = Object.assign(new Error('rate limited'), { code: 'rate_limit' });
      mockStripe.customers.retrieve.mockRejectedValueOnce(otherErr);

      await expect(service.ensureCustomer(ws)).rejects.toBe(otherErr);
    });

    it('creates new customer when workspace has no customerId', async () => {
      const ws = wsBase({ stripeCustomerId: null });
      mockUserRepo.findOne.mockResolvedValueOnce({ id: 'user-1', email: 'owner@x.com' });
      mockStripe.customers.create.mockResolvedValueOnce({ id: 'cus_brand_new' });

      const id = await service.ensureCustomer(ws);

      expect(id).toBe('cus_brand_new');
      expect(mockStripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test WS',
          email: 'owner@x.com',
          metadata: { workspaceId: 'ws-1' },
        }),
      );
    });
  });

  describe('createCheckoutSession', () => {
    it('throws NotFound when workspace missing', async () => {
      mockWsRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.createCheckoutSession('pro')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when plan missing', async () => {
      mockWsRepo.findOne.mockResolvedValueOnce(wsBase());
      mockPlanRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.createCheckoutSession('ghost')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequest when plan has no stripePriceId', async () => {
      mockWsRepo.findOne.mockResolvedValueOnce(wsBase());
      mockPlanRepo.findOne.mockResolvedValueOnce(planBase({ stripePriceId: null as any }));
      await expect(service.createCheckoutSession('pro')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns checkout url with correct metadata + redirect urls', async () => {
      mockWsRepo.findOne.mockResolvedValueOnce(wsBase({ stripeCustomerId: 'cus_existing' }));
      mockPlanRepo.findOne.mockResolvedValueOnce(planBase());
      mockStripe.customers.retrieve.mockResolvedValueOnce({ id: 'cus_existing', deleted: false });
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({ url: 'https://stripe.test/checkout/abc' });

      const result = await service.createCheckoutSession('pro');

      expect(result).toEqual({ url: 'https://stripe.test/checkout/abc' });
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          customer: 'cus_existing',
          line_items: [{ price: 'price_123', quantity: 1 }],
          client_reference_id: 'ws-1',
          metadata: { workspaceId: 'ws-1', planSlug: 'pro' },
          success_url: 'https://app.test/billing/success?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: 'https://app.test/billing/cancel',
        }),
      );
    });

    it('throws InternalServerError when Stripe returns no url', async () => {
      mockWsRepo.findOne.mockResolvedValueOnce(wsBase({ stripeCustomerId: 'cus_existing' }));
      mockPlanRepo.findOne.mockResolvedValueOnce(planBase());
      mockStripe.customers.retrieve.mockResolvedValueOnce({ id: 'cus_existing', deleted: false });
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({ url: null });

      await expect(service.createCheckoutSession('pro')).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('createPortalSession', () => {
    it('throws NotFound when workspace missing', async () => {
      mockWsRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.createPortalSession()).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequest when workspace has no stripeCustomerId', async () => {
      mockWsRepo.findOne.mockResolvedValueOnce(wsBase({ stripeCustomerId: null }));
      await expect(service.createPortalSession()).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns portal url with return_url to settings', async () => {
      mockWsRepo.findOne.mockResolvedValueOnce(wsBase({ stripeCustomerId: 'cus_x' }));
      mockStripe.billingPortal.sessions.create.mockResolvedValueOnce({ url: 'https://stripe.test/portal/x' });

      const result = await service.createPortalSession();

      expect(result).toEqual({ url: 'https://stripe.test/portal/x' });
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_x',
        return_url: 'https://app.test/settings?tab=sistema',
      });
    });
  });

  describe('handleWebhook', () => {
    const rawBody = Buffer.from('{}');

    it('throws BadRequest when signature is invalid', async () => {
      mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('signature mismatch');
      });
      await expect(service.handleWebhook(rawBody, 'bad-sig')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws InternalServerError when STRIPE_WEBHOOK_SECRET missing', async () => {
      const noSecretConfig = { get: jest.fn(() => undefined) } as unknown as ConfigService;
      const m: TestingModule = await Test.createTestingModule({
        providers: [
          BillingService,
          { provide: STRIPE_CLIENT, useValue: mockStripe },
          { provide: getRepositoryToken(Workspace), useValue: mockWsRepo },
          { provide: getRepositoryToken(Plan), useValue: mockPlanRepo },
          { provide: getRepositoryToken(User), useValue: mockUserRepo },
          { provide: TenantContext, useValue: mockTenant },
          { provide: ConfigService, useValue: noSecretConfig },
        ],
      }).compile();
      const svcNoSecret = m.get(BillingService);
      await expect(svcNoSecret.handleWebhook(rawBody, 'sig')).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('skips processing when event was already inserted (idempotency)', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValueOnce({ id: 'evt_dup', type: 'checkout.session.completed', data: { object: {} } });
      mockWsRepo.query.mockResolvedValueOnce([]); // INSERT ... ON CONFLICT DO NOTHING returned no rows

      await service.handleWebhook(rawBody, 'sig');

      // Should not have updated anything because it short-circuited.
      expect(mockWsRepo.update).not.toHaveBeenCalled();
    });

    it('rolls back lock when processor throws', async () => {
      const sessionData = { metadata: { workspaceId: 'ws-1', planSlug: 'pro' }, customer: 'cus_x', subscription: 'sub_y' };
      mockStripe.webhooks.constructEvent.mockReturnValueOnce({ id: 'evt_err', type: 'checkout.session.completed', data: { object: sessionData } });
      mockWsRepo.query.mockResolvedValueOnce([{ id: 'evt_err' }]); // insert ok
      mockWsRepo.update.mockRejectedValueOnce(new Error('db down'));
      mockWsRepo.query.mockResolvedValueOnce(undefined); // delete rollback

      await expect(service.handleWebhook(rawBody, 'sig')).rejects.toThrow('db down');

      expect(mockWsRepo.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "stripe_webhook_events"'),
        ['evt_err'],
      );
    });

    it('checkout.session.completed updates workspace with customer/subscription/plan/active', async () => {
      const sessionData = {
        metadata: { workspaceId: 'ws-1', planSlug: 'pro' },
        customer: 'cus_abc',
        subscription: 'sub_def',
      };
      mockStripe.webhooks.constructEvent.mockReturnValueOnce({ id: 'evt_chk', type: 'checkout.session.completed', data: { object: sessionData } });
      mockWsRepo.query.mockResolvedValueOnce([{ id: 'evt_chk' }]);

      await service.handleWebhook(rawBody, 'sig');

      expect(mockWsRepo.update).toHaveBeenCalledWith('ws-1', {
        stripeCustomerId: 'cus_abc',
        stripeSubscriptionId: 'sub_def',
        planSlug: 'pro',
        subscriptionStatus: 'active',
      });
    });

    it('checkout.session.completed without workspaceId is ignored without throwing', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValueOnce({ id: 'evt_ghost', type: 'checkout.session.completed', data: { object: { metadata: {}, customer: 'cus' } } });
      mockWsRepo.query.mockResolvedValueOnce([{ id: 'evt_ghost' }]);

      await expect(service.handleWebhook(rawBody, 'sig')).resolves.toBeUndefined();
      expect(mockWsRepo.update).not.toHaveBeenCalled();
    });

    it('customer.subscription.updated maps stripe statuses to internal ones', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValueOnce({
        id: 'evt_sub',
        type: 'customer.subscription.updated',
        data: { object: {
          id: 'sub_1',
          status: 'incomplete_expired',
          metadata: { workspaceId: 'ws-1' },
          items: { data: [{ price: { id: 'price_999' } }] },
          current_period_end: 1_700_000_000,
          cancel_at_period_end: true,
        } },
      });
      mockWsRepo.query.mockResolvedValueOnce([{ id: 'evt_sub' }]);
      mockWsRepo.findOne.mockResolvedValueOnce(wsBase());
      mockPlanRepo.findOne.mockResolvedValueOnce(planBase({ slug: 'enterprise' }));

      await service.handleWebhook(rawBody, 'sig');

      expect(mockWsRepo.update).toHaveBeenCalledWith('ws-1', expect.objectContaining({
        stripeSubscriptionId: 'sub_1',
        planSlug: 'enterprise',
        subscriptionStatus: 'expired',
        currentPeriodEnd: new Date(1_700_000_000 * 1000),
        cancelAtPeriodEnd: true,
      }));
    });

    it('customer.subscription.deleted marks workspace as canceled', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValueOnce({
        id: 'evt_del',
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_x' } },
      });
      mockWsRepo.query.mockResolvedValueOnce([{ id: 'evt_del' }]);
      mockWsRepo.findOne.mockResolvedValueOnce(wsBase({ stripeSubscriptionId: 'sub_x' }));

      await service.handleWebhook(rawBody, 'sig');

      expect(mockWsRepo.update).toHaveBeenCalledWith('ws-1', {
        subscriptionStatus: 'canceled',
        cancelAtPeriodEnd: false,
      });
    });

    it('customer.subscription.deleted with no matching workspace is no-op', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValueOnce({
        id: 'evt_del2',
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_unknown' } },
      });
      mockWsRepo.query.mockResolvedValueOnce([{ id: 'evt_del2' }]);
      mockWsRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.handleWebhook(rawBody, 'sig')).resolves.toBeUndefined();
      expect(mockWsRepo.update).not.toHaveBeenCalled();
    });

    it('unknown event types are ignored', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValueOnce({
        id: 'evt_unknown',
        type: 'random.weird.event',
        data: { object: {} },
      });
      mockWsRepo.query.mockResolvedValueOnce([{ id: 'evt_unknown' }]);

      await expect(service.handleWebhook(rawBody, 'sig')).resolves.toBeUndefined();
      expect(mockWsRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('getMyBilling', () => {
    it('throws NotFound when workspace missing', async () => {
      mockWsRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.getMyBilling()).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns full billing snapshot for workspace', async () => {
      mockWsRepo.findOne.mockResolvedValueOnce(wsBase({
        stripeCustomerId: 'cus_x',
        stripeSubscriptionId: 'sub_y',
        planSlug: 'pro',
        subscriptionStatus: 'active',
        currentPeriodEnd: new Date('2026-12-31'),
        cancelAtPeriodEnd: false,
      }));

      const snap = await service.getMyBilling();

      expect(snap).toEqual({
        enabled: true,
        stripeCustomerId: 'cus_x',
        stripeSubscriptionId: 'sub_y',
        subscriptionStatus: 'active',
        planSlug: 'pro',
        currentPeriodEnd: new Date('2026-12-31'),
        cancelAtPeriodEnd: false,
      });
    });
  });
});
