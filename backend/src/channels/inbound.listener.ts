import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { PipelinesService } from '../pipelines/pipelines.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { ChannelsService } from './channels.service';

interface InboundEvent {
  channelType: string;
  channelConfigId: string | null;
  phoneNumberId?: string;
  externalMessageId: string;
  from: string;
  fromName?: string;
  body: string;
  receivedAt: Date;
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
  ) {}

  @OnEvent('message.inbound.received')
  async handle(evt: InboundEvent): Promise<void> {
    try {
      // 1. Resolve channelConfigId (Meta webhooks don't include it directly)
      let channelConfigId = evt.channelConfigId;
      if (!channelConfigId && evt.phoneNumberId) {
        const all = await this.channels.findAll();
        const found = all.find((c) => c.config?.phoneNumberId === evt.phoneNumberId);
        channelConfigId = found?.id ?? null;
      }
      if (!channelConfigId) {
        this.logger.warn(`No channel config for inbound from ${evt.from}`);
        return;
      }

      // 2. Find or create contact
      const contact = await this.contacts.findOrCreateByPhone(evt.from, evt.fromName ?? evt.from);

      // 3. Find default pipeline + first stage
      const defaultPipeline = await this.pipelines.findDefault();
      if (!defaultPipeline || !defaultPipeline.stages?.length) {
        this.logger.error('No default pipeline or stages — cannot create lead for inbound message');
        return;
      }
      const firstStage = [...defaultPipeline.stages].sort((a, b) => a.position - b.position)[0];

      // 4. Find or create lead for this contact in default pipeline
      let lead = await this.leads.findByContactAndPipeline(contact.id, defaultPipeline.id);
      const isNewLead = !lead;
      if (!lead) {
        lead = await this.leads.create({
          contactId: contact.id,
          pipelineId: defaultPipeline.id,
          stageId: firstStage.id,
        });
        this.events.emit('lead.created', { lead, stageId: firstStage.id });
      }

      // 5. Find or create conversation (keyed on leadId + channelType)
      const conv = await this.conversations.findOrCreate(lead.id, evt.channelType, evt.from);

      // 6. Save message (dedup via UNIQUE externalMessageId)
      const saved = await this.messages.saveInbound({
        conversationId: conv.id,
        externalMessageId: evt.externalMessageId,
        body: evt.body,
        sentAt: evt.receivedAt,
      });
      if (!saved) {
        this.logger.debug(`Duplicate webhook — externalMessageId ${evt.externalMessageId} skipped`);
        return;
      }

      // 7. Emit downstream event for WebSocket/notifications
      this.events.emit('message.received', { message: saved, lead, conversation: conv, isNewLead });
    } catch (err: any) {
      this.logger.error(`Inbound handling failed: ${err.message}`, err.stack);
    }
  }
}
