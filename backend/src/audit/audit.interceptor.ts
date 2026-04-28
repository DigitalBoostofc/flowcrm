import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { AuditService } from './audit.service';
import { AUDIT_SKIP_KEY } from './audit-skip.decorator';

// Methods whose effect is non-mutating — we don't audit reads.
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// URL prefixes whose noise we don't want recording. Webhooks and health
// produce volume and have their own observability paths.
const SKIP_PATH_PREFIXES = [
  '/api/health',
  '/api/webhooks/',
  '/api/_internal/',
];

interface RequestUser {
  // Conforms to JwtStrategy.validate() return: { id, email, role, workspaceId }.
  id?: string;
  workspaceId?: string;
}

const isUuid = (s?: string) => !!s && /^[0-9a-f-]{36}$/i.test(s);

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function inferActionAndResource(req: Request): { action: string; resourceType: string | null; resourceId: string | null } {
  const method = req.method.toUpperCase();
  const path = (req.baseUrl ?? '') + (req.path ?? req.url);
  const segments = path
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter((s) => s && s !== 'api')
    .map(safeDecode);

  // Heuristic: /api/<resource>/<id?>/<sub-action?>...
  // Build action pieces by skipping UUID segments (they're identifiers, not action names).
  const resource = segments[0] ?? 'unknown';
  const resourceId = isUuid(segments[1]) ? segments[1] : null;
  const verbSegments = segments.slice(1).filter((s) => !isUuid(s));

  const verbFromMethod = (() => {
    switch (method) {
      case 'POST': return 'create';
      case 'PATCH':
      case 'PUT': return 'update';
      case 'DELETE': return 'delete';
      default: return method.toLowerCase();
    }
  })();

  // If there are non-id segments after the resource, use them as the action verb chain.
  // Otherwise fall back to the HTTP-method-derived verb.
  const action = verbSegments.length > 0
    ? `${resource}.${verbSegments.join('.')}`
    : `${resource}.${verbFromMethod}`;

  return {
    action,
    resourceType: resource ? capitalize(singularize(resource)) : null,
    resourceId,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function singularize(s: string): string {
  // crude — handles "leads" → "lead", "contacts" → "contact". Edge cases acceptable for log labels.
  if (s.endsWith('ies')) return s.slice(0, -3) + 'y';
  if (s.endsWith('s')) return s.slice(0, -1);
  return s;
}

function pickIp(req: Request): string | null {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return req.ip ?? null;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService, private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const res = context.switchToHttp().getResponse<Response>();

    const skip = this.reflector.getAllAndOverride<boolean>(AUDIT_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

    const method = req.method.toUpperCase();
    if (READ_METHODS.has(method)) return next.handle();

    const path = (req.baseUrl ?? '') + (req.path ?? req.url);
    if (SKIP_PATH_PREFIXES.some((p) => path.startsWith(p))) return next.handle();

    return next.handle().pipe(
      tap({
        next: (body) => {
          // Only record on success (2xx). Errors are captured separately by Sentry.
          if (res.statusCode >= 400) return;

          const { action, resourceType, resourceId: pathResourceId } = inferActionAndResource(req);
          const responseId = (body && typeof body === 'object' && 'id' in (body as Record<string, unknown>))
            ? String((body as Record<string, unknown>).id)
            : null;

          // Body summary as the changes field. Service-level granularity (before/after diff)
          // requires explicit AuditService.record() calls — see AUDIT.md.
          const sanitizedBody = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;

          void this.auditService.record({
            workspaceId: req.user?.workspaceId ?? null,
            userId: req.user?.id ?? null,
            action,
            resourceType,
            resourceId: pathResourceId ?? responseId,
            changes: sanitizedBody,
            ipAddress: pickIp(req),
            userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
            requestId: typeof req.headers['x-correlation-id'] === 'string' ? req.headers['x-correlation-id'] : null,
          });
        },
      }),
    );
  }
}
