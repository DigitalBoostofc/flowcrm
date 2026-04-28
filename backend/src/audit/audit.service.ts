import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditEventInput {
  workspaceId?: string | null;
  userId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

// Fields whose values must never enter the audit trail. Mirrored on the Pino
// redact list (logger.config.ts). Match is case-insensitive and partial.
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwordhash/i,
  /passphrase/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /apikey/i,
  /api_key/i,
  /privatekey/i,
  /private_key/i,
  /webhooksecret/i,
  /jwt/i,
];

const REDACTED = '[REDACTED]';

function redactSensitive(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY_PATTERNS.some((re) => re.test(k)) ? REDACTED : redactSensitive(v);
    }
    return out;
  }
  return value;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  /**
   * Records an audit event. Failures are swallowed (we never break a request
   * because audit logging glitched) but logged via Pino.
   */
  async record(event: AuditEventInput): Promise<void> {
    try {
      const sanitized = event.changes ? (redactSensitive(event.changes) as Record<string, unknown>) : null;
      // TypeORM's _QueryDeepPartialEntity over a generic jsonb Record is hostile;
      // jsonb columns require an `any`-shaped payload at insert time.
      await this.repo.insert({
        workspaceId: event.workspaceId ?? null,
        userId: event.userId ?? null,
        action: event.action,
        resourceType: event.resourceType ?? null,
        resourceId: event.resourceId ?? null,
        changes: sanitized as unknown as Record<string, never>,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ? event.userAgent.slice(0, 500) : null,
        requestId: event.requestId ?? null,
      });
    } catch (err) {
      this.logger.error(`Failed to record audit event ${event.action}: ${(err as Error).message}`);
    }
  }

  /**
   * Removes audit rows older than `days`. Default 90.
   * Designed to be called by a scheduled job in a follow-up; today no caller.
   */
  async pruneOlderThan(days = 90): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const res = await this.repo.delete({ createdAt: LessThan(cutoff) });
    return res.affected ?? 0;
  }
}
