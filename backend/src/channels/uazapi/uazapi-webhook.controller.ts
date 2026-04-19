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
    const channel = await this.channels.findByIdUnscoped(channelConfigId);
    if (!channel || secret !== channel.config.webhookSecret) {
      this.logger.warn(`Webhook não autorizado para canal ${channelConfigId}`);
      throw new UnauthorizedException();
    }

    // uazapiGO v2 envia `EventType`; legado envia `event`. Normaliza ambos.
    const eventType: string = payload?.EventType ?? payload?.event ?? '';
    this.logger.log(`webhook received for ${channelConfigId}: event=${eventType || 'unknown'}`);

    if (eventType === 'qrcode') {
      const qr: string =
        payload?.qrcode ??
        payload?.data?.qrcode ??
        payload?.data?.qr ??
        '';
      if (qr) {
        await this.uazapi.saveQrCode(channelConfigId, qr);
        this.logger.log(`QR atualizado para canal ${channelConfigId}`);
      }
      return { ok: true };
    }

    if (eventType === 'connection') {
      // v2: payload.instance.status/connected ; legado: payload.data.connected
      const connected: boolean =
        payload?.instance?.status === 'connected' ||
        payload?.connected === true ||
        payload?.data?.connected === true;
      const status = connected ? 'connected' : 'disconnected';
      await this.channels.updateStatus(channelConfigId, status);
      if (connected) {
        const owner: string = payload?.instance?.owner ?? payload?.data?.instance?.owner ?? '';
        const phone: string = owner.replace('@s.whatsapp.net', '');
        const profileName: string = payload?.instance?.profileName ?? payload?.data?.instance?.profileName ?? '';
        if (phone) await this.channels.updateConfig(channelConfigId, { connectedPhone: phone, profileName });
      }
      this.events.emit('channel.status.changed', { channelConfigId, status });
      this.logger.log(`Canal ${channelConfigId} → ${status}`);
      return { ok: true };
    }

    // v2: EventType === 'messages' (plural) com payload.message ; legado: 'message' com payload.data
    if (eventType === 'messages' || eventType === 'message') {
      const msg = payload?.message ?? payload?.data ?? {};
      const fromMe: boolean = msg?.fromMe ?? msg?.key?.fromMe ?? false;
      if (fromMe) return { ok: true };

      const text: string =
        msg?.text ??
        msg?.content ??
        msg?.message?.conversation ??
        msg?.message?.extendedTextMessage?.text ??
        '';
      if (!text) {
        this.logger.debug(`Ignorando mensagem sem texto (type=${msg?.type ?? msg?.messageType ?? 'unknown'})`);
        return { ok: true };
      }

      const chatid: string = msg?.chatid ?? msg?.key?.remoteJid ?? '';
      const from = chatid.replace('@s.whatsapp.net', '').replace(/@lid$/, '');
      const fromName: string = msg?.senderName ?? payload?.chat?.name ?? msg?.pushName ?? '';
      const externalMessageId: string = msg?.messageid ?? msg?.key?.id ?? `uza-${Date.now()}`;

      // v2: messageTimestamp já em ms (13 dígitos). Legado: em segundos. Normaliza pela magnitude.
      const rawTs: number = msg?.messageTimestamp ?? Date.now();
      const receivedAt = new Date(rawTs > 1e12 ? rawTs : rawTs * 1000);

      this.logger.log(`inbound message from ${from} (${fromName}): "${text.slice(0, 60)}"`);

      this.events.emit('message.inbound.received', {
        channelConfigId,
        channelType: 'uazapi',
        externalMessageId,
        from,
        fromName,
        body: text,
        receivedAt,
      });
    }

    return { ok: true };
  }
}
