import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditService } from './audit.service';

@Injectable()
export class AuditPruneScheduler {
  private readonly logger = new Logger(AuditPruneScheduler.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  // Daily at 03:30 — outside peak hours and after the daily backup window.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run(): Promise<void> {
    const enabled = this.config.get<boolean>('AUDIT_PRUNE_ENABLED', true);
    if (!enabled) return;
    const days = this.config.get<number>('AUDIT_RETENTION_DAYS', 90);
    try {
      const removed = await this.auditService.pruneOlderThan(days);
      if (removed > 0) {
        this.logger.log(`Pruned ${removed} audit_logs older than ${days}d`);
      }
    } catch (err) {
      this.logger.error(`Audit prune failed: ${(err as Error).message}`);
    }
  }
}
