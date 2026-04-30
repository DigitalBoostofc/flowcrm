import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ChannelsService } from '../../channels/channels.service';
import { TenantContext } from '../../common/tenant/tenant-context.service';
import { QUEUE_OUTBOUND } from '../../common/queues/queue-names';
import { OutboundMessageJob } from './outbound-job.types';

/**
 * Worker that drains QUEUE_OUTBOUND and forwards each job to ChannelsService.send.
 * BullMQ takes care of retries (3 attempts + exponential backoff at the
 * QueuesModule defaultJobOptions).
 *
 * Workspace context is rebuilt from the job payload via tenant.run() — the
 * worker is detached from the originating HTTP request CLS.
 */
@Processor(QUEUE_OUTBOUND, { limiter: { max: 30, duration: 60_000 } })
export class OutboundMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundMessageProcessor.name);

  constructor(
    private readonly channels: ChannelsService,
    private readonly tenant: TenantContext,
  ) {
    super();
  }

  async process(job: Job<OutboundMessageJob>): Promise<void> {
    const { workspaceId, userId, channelConfigId, to, body, reason } = job.data;
    await this.tenant.run(workspaceId, userId ?? undefined, async () => {
      const result = await this.channels.send({ channelConfigId, to, body });
      if (result.status === 'failed') {
        // Throwing makes BullMQ retry per defaultJobOptions until attempts exhausted.
        throw new Error(result.error ?? 'channels.send returned status=failed');
      }
      this.logger.log(`outbound sent ws=${workspaceId} reason=${reason ?? '-'} job=${job.id}`);
    });
  }
}
