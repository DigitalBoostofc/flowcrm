import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduledMessage } from './entities/scheduled-message.entity';
import { ChannelsService } from '../channels/channels.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { QUEUE_SCHEDULED } from '../common/queues/queues.module';

@Processor(QUEUE_SCHEDULED)
export class ScheduledMessageProcessor extends WorkerHost {
  private logger = new Logger(ScheduledMessageProcessor.name);

  constructor(
    @InjectRepository(ScheduledMessage) private repo: Repository<ScheduledMessage>,
    private channels: ChannelsService,
    private conversations: ConversationsService,
    private messages: MessagesService,
  ) {
    super();
  }

  async process(job: Job<{ scheduledMessageId: string }>): Promise<void> {
    const record = await this.repo.findOneByOrFail({ id: job.data.scheduledMessageId });
    if (record.status !== 'pending') return;

    const conv = await this.conversations.findOne(record.conversationId);
    const result = await this.channels.send({
      channelConfigId: record.channelConfigId,
      to: conv.externalId ?? '',
      body: record.body,
    });

    await this.messages.saveOutbound({
      conversationId: conv.id,
      body: record.body,
      status: result.status,
      externalMessageId: result.externalMessageId,
    });

    await this.repo.update(record.id, { status: result.status === 'sent' ? 'sent' : 'failed' });
    this.logger.log(`Scheduled message ${record.id} delivery: ${result.status}`);
  }
}
