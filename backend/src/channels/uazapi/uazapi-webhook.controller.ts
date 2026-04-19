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
      this.logger.warn(`Webhook não autorizado para canal ${channelConfigId}`);
      throw new UnauthorizedException();
    }

    const event: string = payload?.event ?? '';

    if (event === 'qrcode') {
      const qr: string = payload?.data?.qrcode ?? payload?.data?.qr ?? '';
      if (qr) {
        await this.uazapi.saveQrCode(channelConfigId, qr);
        this.logger.log(`QR atualizado para canal ${channelConfigId}`);
      }
      return { ok: true };
    }

    if (event === 'connection') {
      const connected: boolean = payload?.data?.connected ?? false;
      const status = connected ? 'connected' : 'disconnected';
      await this.channels.updateStatus(channelConfigId, status);
      this.events.emit('channel.status.changed', { channelConfigId, status });
      this.logger.log(`Canal ${channelConfigId} → ${status}`);
      return { ok: true };
    }

    if (event === 'message') {
      const data = payload?.data ?? {};
      const fromMe: boolean = data?.key?.fromMe ?? false;
      if (fromMe) return { ok: true };

      const text: string =
        data?.message?.conversation ??
        data?.message?.extendedTextMessage?.text ??
        '';
      if (!text) return { ok: true };

      this.events.emit('message.inbound.received', {
        channelConfigId,
        channelType: 'uazapi',
        externalMessageId: data?.key?.id ?? `uza-${Date.now()}`,
        from: (data?.key?.remoteJid ?? '').replace('@s.whatsapp.net', ''),
        fromName: data?.pushName ?? '',
        body: text,
        receivedAt: new Date((data?.messageTimestamp ?? Math.floor(Date.now() / 1000)) * 1000),
      });
    }

    return { ok: true };
  }
}
