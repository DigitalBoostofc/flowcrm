import { Body, Controller, Logger, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { ChannelsService } from '../channels.service';
import { UazapiAdapter } from './uazapi.adapter';
import { ApiTags } from '@nestjs/swagger';
import type { MessageType } from '../../messages/entities/message.entity';

function timingSafeStringEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

const MEDIA_TYPES: Record<string, MessageType> = {
  imageMessage: 'image',
  videoMessage: 'video',
  audioMessage: 'audio',
  pttMessage: 'audio',
  documentMessage: 'document',
  stickerMessage: 'sticker',
};

@ApiTags('uazapi-webhook')
@Controller('webhooks/uazapi')
export class UazapiWebhookController {
  private logger = new Logger(UazapiWebhookController.name);

  constructor(
    private channels: ChannelsService,
    private events: EventEmitter2,
    private uazapi: UazapiAdapter,
  ) {}

  @Post(':channelConfigId/:secret')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async receive(
    @Param('channelConfigId') channelConfigId: string,
    @Param('secret') secret: string,
    @Body() payload: any,
  ) {
    const channel = await this.channels.findByIdUnscoped(channelConfigId);
    if (!channel || !timingSafeStringEqual(secret ?? '', channel.config?.webhookSecret ?? '')) {
      this.logger.warn(`Webhook não autorizado para canal ${channelConfigId}`);
      throw new UnauthorizedException();
    }

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
      this.events.emit('channel.status.changed', { channelConfigId, status, workspaceId: channel.workspaceId });
      this.logger.log(`Canal ${channelConfigId} → ${status}`);
      return { ok: true };
    }

    if (eventType === 'messages' || eventType === 'message') {
      const msg = payload?.message ?? payload?.data ?? {};
      const fromMe: boolean = msg?.fromMe ?? msg?.key?.fromMe ?? false;

      const rawMsgType: string = msg?.type ?? msg?.messageType ?? 'conversation';
      const mediaType: MessageType | undefined = MEDIA_TYPES[rawMsgType];

      // Extract text / caption
      const text: string =
        msg?.text ??
        msg?.content ??
        msg?.caption ??
        msg?.message?.conversation ??
        msg?.message?.extendedTextMessage?.text ??
        msg?.message?.imageMessage?.caption ??
        msg?.message?.videoMessage?.caption ??
        msg?.message?.documentMessage?.caption ??
        '';

      // For media messages without caption, use placeholder body so we still save the message
      const body = text || (mediaType ? `[${rawMsgType.replace('Message', '')}]` : '');

      if (!body && !mediaType) {
        this.logger.debug(`Ignorando mensagem sem conteúdo (type=${rawMsgType})`);
        return { ok: true };
      }

      const chatid: string = msg?.chatid ?? msg?.key?.remoteJid ?? '';
      const from = chatid.replace('@s.whatsapp.net', '').replace(/@lid$/, '');
      const fromName: string = msg?.senderName ?? payload?.chat?.name ?? msg?.pushName ?? '';
      const externalMessageId: string = msg?.messageid ?? msg?.key?.id ?? `uza-${Date.now()}`;

      const rawTs: number = msg?.messageTimestamp ?? Date.now();
      const receivedAt = new Date(rawTs > 1e12 ? rawTs : rawTs * 1000);

      // Extract media URL if present
      const mediaUrl: string | undefined =
        msg?.url ??
        msg?.mediaUrl ??
        msg?.message?.imageMessage?.url ??
        msg?.message?.videoMessage?.url ??
        msg?.message?.audioMessage?.url ??
        msg?.message?.documentMessage?.url ??
        msg?.message?.stickerMessage?.url ??
        undefined;

      const mediaMimeType: string | undefined =
        msg?.mimetype ??
        msg?.message?.imageMessage?.mimetype ??
        msg?.message?.videoMessage?.mimetype ??
        msg?.message?.audioMessage?.mimetype ??
        msg?.message?.documentMessage?.mimetype ??
        undefined;

      const mediaFileName: string | undefined =
        msg?.fileName ??
        msg?.message?.documentMessage?.fileName ??
        undefined;

      const eventPayload = {
        channelConfigId,
        channelType: 'uazapi',
        externalMessageId,
        from,
        fromName,
        body,
        receivedAt,
        messageType: mediaType ?? 'text',
        mediaUrl,
        mediaMimeType,
        mediaFileName,
      };

      if (fromMe) {
        // Mensagem enviada direto do celular (não via API do CRM)
        this.logger.log(`outbound-from-phone ${mediaType ?? 'text'} to ${from}: "${body.slice(0, 60)}"`);
        this.events.emit('message.outbound.fromphone', eventPayload);
      } else {
        this.logger.log(`inbound ${mediaType ?? 'text'} from ${from} (${fromName}): "${body.slice(0, 60)}"`);
        this.events.emit('message.inbound.received', eventPayload);
      }
    }

    return { ok: true };
  }
}
