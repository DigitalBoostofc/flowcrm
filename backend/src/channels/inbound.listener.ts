import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { PipelinesService } from '../pipelines/pipelines.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { ChannelsService } from './channels.service';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ChannelConfig } from './entities/channel-config.entity';

interface InboundEvent {
  channelType: string;
  channelConfigId: string | null;
  phoneNumberId?: string;
  externalMessageId: string;
  from: string;
  fromName?: string;
  body: string;
  receivedAt: Date;
  messageType?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaFileName?: string;
}

@Injectable()
export class InboundListener {
  private logger = new Logger(InboundListener.name);

  constructor(
    private contacts: ContactsService,
    private leads: LeadsService,
    private pipelines: PipelinesService,
    private conversations: ConversationsService,
    private messages: MessagesService,
    private channels: ChannelsService,
    private events: EventEmitter2,
    private tenant: TenantContext,
    @InjectRepository(ChannelConfig) private channelRepo: Repository<ChannelConfig>,
  ) {}

  @OnEvent('message.inbound.received')
  async handle(evt: InboundEvent): Promise<void> {
    try {
      let channel: ChannelConfig | null = null;
      if (evt.channelConfigId) {
        channel = await this.channels.findByIdUnscoped(evt.channelConfigId);
      } else if (evt.phoneNumberId) {
        const all = await this.channelRepo.find({ where: { active: true } });
        channel = all.find((c) => c.config?.phoneNumberId === evt.phoneNumberId) ?? null;
      }
      if (!channel) {
        this.logger.warn(`No channel config for inbound from ${evt.from}`);
        return;
      }

      await this.tenant.run(channel.workspaceId, undefined, () => this.process(evt, channel!));
    } catch (err: any) {
      this.logger.error(`Inbound handling failed: ${err.message}`, err.stack);
    }
  }

  private async process(evt: InboundEvent, channel: ChannelConfig): Promise<void> {
    const defaultPipeline = await this.pipelines.findDefault();
    if (!defaultPipeline || !defaultPipeline.stages?.length) {
      this.logger.error('No default pipeline or stages — cannot create lead for inbound message');
      return;
    }
    const firstStage = [...defaultPipeline.stages].sort((a, b) => a.position - b.position)[0];

    const contact = await this.contacts.findByPhone(evt.from);

    let lead = contact
      ? await this.leads.findByContactAndPipeline(contact.id, defaultPipeline.id)
      : await this.leads.findByExternalPhoneAndPipeline(evt.from, defaultPipeline.id);

    const isNewLead = !lead;
    if (!lead) {
      lead = await this.leads.create(
        contact
          ? {
              contactId: contact.id,
              pipelineId: defaultPipeline.id,
              stageId: firstStage.id,
            }
          : {
              pipelineId: defaultPipeline.id,
              stageId: firstStage.id,
              externalName: evt.fromName ?? evt.from,
              externalPhone: evt.from,
            },
      );
      this.events.emit('lead.created', { lead, stageId: firstStage.id, workspaceId: channel.workspaceId });
    }

    const conv = await this.conversations.findOrCreate(lead.id, evt.channelType, evt.from);

    const saved = await this.messages.saveInbound({
      conversationId: conv.id,
      externalMessageId: evt.externalMessageId,
      body: evt.body,
      sentAt: evt.receivedAt,
      type: (evt.messageType as any) ?? 'text',
      mediaUrl: evt.mediaUrl,
      mediaMimeType: evt.mediaMimeType,
      mediaFileName: evt.mediaFileName,
    });
    if (!saved) {
      this.logger.debug(`Duplicate webhook — externalMessageId ${evt.externalMessageId} skipped`);
      return;
    }

    this.events.emit('message.received', { message: saved, lead: { ...lead, contact }, conversation: conv, isNewLead, workspaceId: channel.workspaceId });
    void channel;
  }
}
