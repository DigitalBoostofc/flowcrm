import { Body, Controller, Logger, Param, Post, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChannelsService } from '../channels.service';
import { UazapiAdapter } from './uazapi.adapter';

@Controller('webhooks/uazapi')
export class UazapiWebhookController {
  private logger = new Logger(UazapiWebhookController.name);

  constructor(
    private channels: ChannelsService,
    private events: EventEmitter2,
    private uazapi: UazapiAdapter,
  ) {}

  @Post(':channelConfigId/:secret')
  async receive(
    @Param('channelConfigId') channelConfigId: string,
    @Param('secret') secret: string,
    @Body() payload: any,
  ) {
    const channel = await this.channels.findById(channelConfigId);
    if (secret !== channel.config.webhookSecret) {
      this.logger.warn(`Unauthorized webhook for channel ${channelConfigId}`);
      throw new UnauthorizedException();
    }

    const type: string = payload?.type ?? '';

    if (type === 'QrCode') {
      const base64: string = payload?.body?.qr ?? payload?.body?.base64 ?? '';
      if (base64) {
        await this.uazapi.saveQrCode(channelConfigId, base64);
        this.logger.log(`QR code updated for channel ${channelConfigId}`);
      }
      return { ok: true };
    }

    if (type === 'Connected') {
      await this.channels.updateStatus(channelConfigId, 'connected');
      this.events.emit('channel.status.changed', { channelConfigId, status: 'connected' });
      return { ok: true };
    }

    if (type === 'Disconnected') {
      await this.channels.updateStatus(channelConfigId, 'disconnected');
      this.events.emit('channel.status.changed', { channelConfigId, status: 'disconnected' });
      return { ok: true };
    }

    if (type === 'Message') {
      const info = payload?.body?.Info;
      if (!info || info.FromMe) return { ok: true };
      const text: string = payload?.body?.Text ?? payload?.body?.Message?.Conversation ?? '';
      if (!text) return { ok: true };
      this.events.emit('message.inbound.received', {
        channelConfigId,
        channelType: 'uazapi',
        externalMessageId: info.ID,
        from: (info.RemoteJid ?? '').replace('@s.whatsapp.net', ''),
        fromName: info.PushName ?? '',
        body: text,
        receivedAt: new Date((info.Timestamp ?? Math.floor(Date.now() / 1000)) * 1000),
      });
    }

    return { ok: true };
  }
}
