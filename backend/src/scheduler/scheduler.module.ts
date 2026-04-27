import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { ScheduledMessageProcessor } from './scheduled-message.processor';
import { SchedulerReconciliationService } from './scheduler-reconciliation.service';
import { ScheduledMessage } from './entities/scheduled-message.entity';
import { ChannelConfig } from '../channels/entities/channel-config.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { QUEUE_SCHEDULED } from '../common/queues/queues.module';
import { ChannelsModule } from '../channels/channels.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledMessage, ChannelConfig, Conversation]),
    BullModule.registerQueue({ name: QUEUE_SCHEDULED }),
    ChannelsModule,
    ConversationsModule,
    MessagesModule,
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService, ScheduledMessageProcessor, SchedulerReconciliationService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
