import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
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
    private conversations: ConversationsService,
    private messages: MessagesService,
    private channels: ChannelsService,
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
    // Find existing conversation by externalId (phone) — reuses it if contact was already qualified.
    // If none exists, creates a new conversation without a lead (unqualified).
    const conv = await this.conversations.findOrCreateUnqualified(
      evt.channelType,
      evt.from,
      channel.workspaceId,
    );

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
    }
  }
}
