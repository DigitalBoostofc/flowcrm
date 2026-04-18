import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { ScheduledMessage } from './entities/scheduled-message.entity';
import { QUEUE_SCHEDULED } from '../common/queues/queues.module';

@Injectable()
export class SchedulerReconciliationService implements OnModuleInit {
  private logger = new Logger(SchedulerReconciliationService.name);

  constructor(
    @InjectRepository(ScheduledMessage) private repo: Repository<ScheduledMessage>,
    @InjectQueue(QUEUE_SCHEDULED) private queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    const pending = await this.repo.find({
      where: { status: 'pending', scheduledAt: MoreThan(new Date()) },
    });
    let reconciled = 0;
    for (const m of pending) {
      if (m.bullJobId) {
        const existing = await this.queue.getJob(m.bullJobId);
        if (existing) continue;
      }
      const delay = Math.max(0, m.scheduledAt.getTime() - Date.now());
      const job = await this.queue.add('send', { scheduledMessageId: m.id }, { delay });
      await this.repo.update(m.id, { bullJobId: job.id ?? undefined });
      reconciled++;
    }
    if (reconciled > 0) {
      this.logger.log(`Reconciled ${reconciled} scheduled messages on boot`);
    }
  }
}
