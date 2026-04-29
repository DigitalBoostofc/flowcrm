import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TrashService } from './trash.service';

@Injectable()
export class TrashPruneScheduler {
  private readonly logger = new Logger(TrashPruneScheduler.name);

  constructor(
    private readonly trash: TrashService,
    private readonly config: ConfigService,
  ) {}

  // Daily at 04:00 — staggered after audit prune (03:00) and outside backup window.
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async run(): Promise<void> {
    const enabled = this.config.get<boolean>('TRASH_PRUNE_ENABLED', true);
    if (!enabled) return;
    const days = this.config.get<number>('TRASH_RETENTION_DAYS', 30);
    try {
      const removed = await this.trash.purgeOlderThan(days);
      const total = Object.values(removed).reduce((a, b) => a + b, 0);
      if (total > 0) {
        this.logger.log(`Purged ${total} trash rows older than ${days}d: ${JSON.stringify(removed)}`);
      }
    } catch (err) {
      this.logger.error(`Trash purge failed: ${(err as Error).message}`);
    }
  }
}
