import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Not, IsNull, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AccountPruneScheduler {
  private readonly logger = new Logger(AccountPruneScheduler.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  // Daily at 04:30 — after trash purge (04:00).
  @Cron('30 4 * * *')
  async run(): Promise<void> {
    const enabled = this.config.get<boolean>('ACCOUNT_PRUNE_ENABLED', true);
    if (!enabled) return;
    try {
      const now = new Date();
      const due = await this.users.find({
        where: { scheduledDeletionAt: LessThanOrEqual(now) as any },
        select: ['id', 'email', 'workspaceId'],
      });
      for (const u of due) {
        await this.users.delete({ id: u.id });
        this.logger.log(`Hard-deleted user ${u.email} (${u.id}) after grace window`);
      }
      // Note: not cascading workspace deletion here. The owner-self-delete
      // path is gated upstream (see MeService.scheduleAccountDeletion).
    } catch (err) {
      this.logger.error(`Account prune failed: ${(err as Error).message}`);
    }
  }
}
