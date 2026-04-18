import { Injectable, Logger } from '@nestjs/common';
import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QUEUE_AUTOMATION, QUEUE_SCHEDULED, QUEUE_OUTBOUND } from './queue-names';

@Injectable()
@QueueEventsListener(QUEUE_AUTOMATION)
export class AutomationFailedListener extends QueueEventsHost {
  private logger = new Logger(AutomationFailedListener.name);
  constructor(private events: EventEmitter2) {
    super();
  }

  @OnQueueEvent('failed')
  onFailed(job: { jobId: string; failedReason: string }): void {
    this.logger.error(`Automation job ${job.jobId} failed: ${job.failedReason}`);
    this.events.emit('job.failed', { queue: QUEUE_AUTOMATION, jobId: job.jobId, error: job.failedReason });
  }
}

@Injectable()
@QueueEventsListener(QUEUE_SCHEDULED)
export class ScheduledFailedListener extends QueueEventsHost {
  private logger = new Logger(ScheduledFailedListener.name);
  constructor(private events: EventEmitter2) {
    super();
  }

  @OnQueueEvent('failed')
  onFailed(job: { jobId: string; failedReason: string }): void {
    this.logger.error(`Scheduled job ${job.jobId} failed: ${job.failedReason}`);
    this.events.emit('job.failed', { queue: QUEUE_SCHEDULED, jobId: job.jobId, error: job.failedReason });
  }
}

@Injectable()
@QueueEventsListener(QUEUE_OUTBOUND)
export class OutboundFailedListener extends QueueEventsHost {
  private logger = new Logger(OutboundFailedListener.name);
  constructor(private events: EventEmitter2) {
    super();
  }

  @OnQueueEvent('failed')
  onFailed(job: { jobId: string; failedReason: string }): void {
    this.logger.error(`Outbound job ${job.jobId} failed: ${job.failedReason}`);
    this.events.emit('job.failed', { queue: QUEUE_OUTBOUND, jobId: job.jobId, error: job.failedReason });
  }
}
