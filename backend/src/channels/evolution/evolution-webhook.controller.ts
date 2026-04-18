import { Body, Controller, Headers, Logger, Param, Post, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChannelsService } from '../channels.service';

@Controller('webhooks/evolution')
export class EvolutionWebhookController {
  private logger = new Logger(EvolutionWebhookController.name);

  constructor(
    private channels: ChannelsService,
    private events: EventEmitter2,
  ) {}

  @Post(':channelConfigId/:secret')
  async receive(
    @Param('channelConfigId') channelConfigId: string,
    @Param('secret') secret: string,
    @Headers('apikey') apikey: string,
    @Body() payload: any,
  ) {
    const channel = await this.channels.findById(channelConfigId);
    const expectedSecret = channel.config.webhookSecret;
    const expectedApikey = channel.config.apiKey;
    if (secret !== expectedSecret || apikey !== expectedApikey) {
      this.logger.warn(`Unauthorized webhook for channel ${channelConfigId}`);
      throw new UnauthorizedException();
    }

    if (payload.event === 'connection.update') {
      const state = payload.data?.state;
      const status = state === 'open' ? 'connected' : state === 'close' ? 'disconnected' : 'error';
      await this.channels.updateStatus(channelConfigId, status);
      this.events.emit('channel.status.changed', { channelConfigId, status });
      return { ok: true };
    }

    if (payload.event === 'messages.upsert' && payload.data?.key && !payload.data.key.fromMe) {
      const text = payload.data.message?.conversation ?? payload.data.message?.extendedTextMessage?.text ?? '';
      if (!text) return { ok: true };
      this.events.emit('message.inbound.received', {
        channelConfigId,
        channelType: 'evolution',
        externalMessageId: payload.data.key.id,
        from: (payload.data.key.remoteJid ?? '').replace('@s.whatsapp.net', ''),
        fromName: payload.data.pushName,
        body: text,
        receivedAt: new Date((payload.data.messageTimestamp ?? Date.now() / 1000) * 1000),
      });
    }

    return { ok: true };
  }
}
