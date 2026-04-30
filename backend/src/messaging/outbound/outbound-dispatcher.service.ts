import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ChannelsService } from '../../channels/channels.service';
import { QUEUE_OUTBOUND } from '../../common/queues/queue-names';
import { OUTBOUND_JOB_NAME, OutboundMessageJob } from './outbound-job.types';

export type DispatchResult =
  | { mode: 'enqueued'; jobId: string }
  | { mode: 'sync-fallback'; warning: string }
  | { mode: 'sync-fallback-failed'; error: string };

/**
 * Single entrypoint for fire-and-forget outbound WhatsApp sends.
 *
 * Default path: enqueue a job on QUEUE_OUTBOUND (caller returns in <50ms).
 * Fallback: if the enqueue itself fails (Redis off, network), fall back to
 * synchronous channels.send so the caller still has a chance of delivering
 * the message — preserves the legacy behaviour as a safety net.
 *
 * NOTE: a job that *successfully enqueues* but later fails inside the worker
 * is NOT retried synchronously here — BullMQ does its 3 attempts itself, and
 * OutboundFailedListener already logs/emits on terminal failure.
 */
@Injectable()
export class OutboundDispatcherService {
  private readonly logger = new Logger(OutboundDispatcherService.name);

  constructor(
    @InjectQueue(QUEUE_OUTBOUND) private readonly queue: Queue,
    private readonly channels: ChannelsService,
  ) {}

  async dispatch(payload: OutboundMessageJob): Promise<DispatchResult> {
    try {
      const job = await this.queue.add(OUTBOUND_JOB_NAME, payload);
      return { mode: 'enqueued', jobId: String(job.id ?? '') };
    } catch (enqueueErr) {
      const warning = `enqueue failed (${(enqueueErr as Error).message}), falling back to sync send`;
      this.logger.warn(`outbound: ${warning} ws=${payload.workspaceId} reason=${payload.reason ?? '-'}`);
      try {
        const result = await this.channels.send({
          channelConfigId: payload.channelConfigId,
          to: payload.to,
          body: payload.body,
        });
        if (result.status === 'failed') {
          return { mode: 'sync-fallback-failed', error: result.error ?? 'channels.send failed' };
        }
        return { mode: 'sync-fallback', warning };
      } catch (sendErr) {
        return { mode: 'sync-fallback-failed', error: (sendErr as Error).message };
      }
    }
  }
}
