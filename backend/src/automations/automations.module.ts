import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationTriggerListener } from './automation-trigger.listener';
import { AutomationProcessor } from './automation.processor';
import { Automation } from './entities/automation.entity';
import { AutomationExecution } from './entities/automation-execution.entity';
import { QUEUE_AUTOMATION } from '../common/queues/queues.module';
import { LeadsModule } from '../leads/leads.module';
import { TemplatesModule } from '../templates/templates.module';
import { ChannelsModule } from '../channels/channels.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Automation, AutomationExecution]),
    BullModule.registerQueue({ name: QUEUE_AUTOMATION }),
    LeadsModule,
    TemplatesModule,
    ChannelsModule,
    ConversationsModule,
    MessagesModule,
  ],
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationTriggerListener, AutomationProcessor],
  exports: [AutomationsService],
})
export class AutomationsModule {}
