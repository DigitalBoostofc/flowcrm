import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AutomationFailedListener, ScheduledFailedListener, OutboundFailedListener } from './failed-jobs.listener';
import { QUEUE_AUTOMATION, QUEUE_SCHEDULED, QUEUE_OUTBOUND } from './queue-names';

export { QUEUE_AUTOMATION, QUEUE_SCHEDULED, QUEUE_OUTBOUND };

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>('REDIS_URL') },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_AUTOMATION },
      { name: QUEUE_SCHEDULED },
      { name: QUEUE_OUTBOUND },
    ),
  ],
  providers: [AutomationFailedListener, ScheduledFailedListener, OutboundFailedListener],
  exports: [BullModule],
})
export class QueuesModule {}
