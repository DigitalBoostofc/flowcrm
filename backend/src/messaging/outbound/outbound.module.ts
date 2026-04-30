import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ChannelsModule } from '../../channels/channels.module';
import { TenantModule } from '../../common/tenant/tenant.module';
import { QUEUE_OUTBOUND } from '../../common/queues/queue-names';
import { OutboundMessageProcessor } from './outbound.processor';
import { OutboundDispatcherService } from './outbound-dispatcher.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_OUTBOUND }),
    ChannelsModule,
    TenantModule,
  ],
  providers: [OutboundMessageProcessor, OutboundDispatcherService],
  exports: [OutboundDispatcherService],
})
export class OutboundModule {}
