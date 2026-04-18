import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Automation } from './entities/automation.entity';
import { LeadsService } from '../leads/leads.service';
import { TemplatesService } from '../templates/templates.service';
import { ChannelsService } from '../channels/channels.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { interpolate } from '../channels/interpolation.util';
import { QUEUE_AUTOMATION } from '../common/queues/queues.module';

@Processor(QUEUE_AUTOMATION, { limiter: { max: 20, duration: 60000 } })
export class AutomationProcessor extends WorkerHost {
  private logger = new Logger(AutomationProcessor.name);

  constructor(
    @InjectRepository(Automation) private auto: Repository<Automation>,
    private leads: LeadsService,
    private templates: TemplatesService,
    private channels: ChannelsService,
    private conversations: ConversationsService,
    private messages: MessagesService,
  ) {
    super();
  }

  async process(job: Job<{ automationId: string; leadId: string }>): Promise<void> {
    const automation = await this.auto.findOneByOrFail({ id: job.data.automationId });
    const lead = await this.leads.findOne(job.data.leadId);
    const template = await this.templates.findOne(automation.templateId);

    const vars = {
      nome: lead.contact?.name ?? '',
      agente: lead.assignedTo?.name ?? '',
      pipeline: lead.pipeline?.name ?? '',
      etapa: lead.stage?.name ?? '',
    };
    const body = interpolate(template.body, vars);

    const phone = lead.contact?.phone ?? '';
    if (!phone) {
      this.logger.warn(`Lead ${lead.id} has no phone — skipping automation send`);
      return;
    }

    const conv = await this.conversations.findOrCreate(lead.id, automation.channelType, phone);
    const result = await this.channels.send({
      channelConfigId: automation.channelConfigId,
      to: phone,
      body,
    });

    await this.messages.saveOutbound({
      conversationId: conv.id,
      body,
      status: result.status,
      externalMessageId: result.externalMessageId,
    });

    this.logger.log(`Automation ${automation.id} sent for lead ${lead.id}: ${result.status}`);
  }
}
