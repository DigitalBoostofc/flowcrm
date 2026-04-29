import { Reflector } from '@nestjs/core';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

type RequestShape = {
  method: string;
  baseUrl?: string;
  path: string;
  url?: string;
  headers: Record<string, string>;
  body?: unknown;
  ip?: string;
  user?: { id?: string; workspaceId?: string };
};

function buildContext(req: RequestShape, statusCode = 200): ExecutionContext {
  const res = { statusCode };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

function buildHandler(body: unknown = { id: 'lead-123' }): CallHandler {
  return { handle: () => of(body) };
}

describe('AuditInterceptor', () => {
  let auditService: { record: jest.Mock };
  let reflector: Reflector;
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    interceptor = new AuditInterceptor(auditService as unknown as AuditService, reflector);
  });

  async function consume(observable: ReturnType<AuditInterceptor['intercept']>): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      observable.subscribe({ next: () => undefined, error: reject, complete: () => resolve() });
    });
  }

  it('skips GET requests', async () => {
    const ctx = buildContext({ method: 'GET', path: '/api/leads', headers: {} });
    await consume(interceptor.intercept(ctx, buildHandler()));
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('skips HEAD and OPTIONS', async () => {
    for (const method of ['HEAD', 'OPTIONS']) {
      const ctx = buildContext({ method, path: '/api/leads', headers: {} });
      await consume(interceptor.intercept(ctx, buildHandler()));
    }
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('skips paths under /api/health and /api/webhooks/', async () => {
    const ctxHealth = buildContext({ method: 'POST', path: '/api/health/ping', headers: {} });
    const ctxWebhook = buildContext({ method: 'POST', path: '/api/webhooks/stripe', headers: {} });
    await consume(interceptor.intercept(ctxHealth, buildHandler()));
    await consume(interceptor.intercept(ctxWebhook, buildHandler()));
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('skips when @AuditSkip metadata is set', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const ctx = buildContext({ method: 'POST', path: '/api/leads', headers: {} });
    await consume(interceptor.intercept(ctx, buildHandler()));
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('skips when status code is >= 400', async () => {
    const ctx = buildContext(
      { method: 'POST', path: '/api/leads', headers: {}, body: { name: 'X' } },
      422,
    );
    await consume(interceptor.intercept(ctx, buildHandler()));
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('records POST as <resource>.create with body and response.id', async () => {
    const ctx = buildContext({
      method: 'POST',
      path: '/api/leads',
      headers: { 'user-agent': 'jest', 'x-correlation-id': 'corr-1' },
      body: { name: 'Acme' },
      ip: '10.0.0.1',
      user: { id: 'u-1', workspaceId: 'ws-1' },
    });
    await consume(interceptor.intercept(ctx, buildHandler({ id: 'lead-9' })));
    expect(auditService.record).toHaveBeenCalledTimes(1);
    const event = auditService.record.mock.calls[0][0];
    expect(event.action).toBe('leads.create');
    expect(event.resourceType).toBe('Lead');
    expect(event.resourceId).toBe('lead-9');
    expect(event.userId).toBe('u-1');
    expect(event.workspaceId).toBe('ws-1');
    expect(event.changes).toEqual({ name: 'Acme' });
    expect(event.userAgent).toBe('jest');
    expect(event.requestId).toBe('corr-1');
    expect(event.ipAddress).toBe('10.0.0.1');
  });

  it('infers PATCH/PUT as update and pulls resourceId from path', async () => {
    const uuid = '11111111-1111-1111-1111-111111111111';
    const ctx = buildContext({
      method: 'PATCH',
      path: `/api/leads/${uuid}`,
      headers: {},
      body: { stageId: 's-2' },
    });
    await consume(interceptor.intercept(ctx, buildHandler({ id: 'ignored' })));
    const event = auditService.record.mock.calls[0][0];
    expect(event.action).toBe('leads.update');
    expect(event.resourceId).toBe(uuid);
    expect(event.resourceType).toBe('Lead');
  });

  it('infers DELETE as delete', async () => {
    const ctx = buildContext({
      method: 'DELETE',
      path: '/api/contacts/22222222-2222-2222-2222-222222222222',
      headers: {},
    });
    await consume(interceptor.intercept(ctx, buildHandler(null)));
    const event = auditService.record.mock.calls[0][0];
    expect(event.action).toBe('contacts.delete');
    expect(event.resourceType).toBe('Contact');
  });

  it('builds compound actions when there are sub-paths after the resource id', async () => {
    const uuid = '33333333-3333-3333-3333-333333333333';
    const ctx = buildContext({
      method: 'POST',
      path: `/api/leads/${uuid}/move`,
      headers: {},
      body: { stageId: 's-3' },
    });
    await consume(interceptor.intercept(ctx, buildHandler({ id: uuid })));
    const event = auditService.record.mock.calls[0][0];
    expect(event.action).toBe('leads.move');
    expect(event.resourceId).toBe(uuid);
  });

  it('takes the first IP from x-forwarded-for', async () => {
    const ctx = buildContext({
      method: 'POST',
      path: '/api/leads',
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
      body: {},
    });
    await consume(interceptor.intercept(ctx, buildHandler()));
    const event = auditService.record.mock.calls[0][0];
    expect(event.ipAddress).toBe('203.0.113.5');
  });

  it('does not break the request flow when audit.record throws', async () => {
    auditService.record.mockRejectedValueOnce(new Error('db down'));
    const ctx = buildContext({ method: 'POST', path: '/api/leads', headers: {}, body: {} });
    await expect(consume(interceptor.intercept(ctx, buildHandler()))).resolves.toBeUndefined();
  });
});
