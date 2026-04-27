import { Body, Controller, Logger, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { ChannelsService } from '../channels.service';
import { EvolutionAdapter } from './evolution.adapter';

function timingSafeStringEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

@Controller('webhooks/evolution')
export class EvolutionWebhookController {
  private logger = new Logger(EvolutionWebhookController.name);

  constructor(
    private channels: ChannelsService,
    private events: EventEmitter2,
    private evolution: EvolutionAdapter,
  ) {}

  @Post(':channelConfigId/:secret')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async receive(
    @Param('channelConfigId') channelConfigId: string,
    @Param('secret') secret: string,
    @Body() payload: any,
  ) {
    return this.handle(channelConfigId, secret, payload);
  }

  @Post(':channelConfigId/:secret/:event')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async receiveByEvent(
    @Param('channelConfigId') channelConfigId: string,
    @Param('secret') secret: string,
    @Body() payload: any,
  ) {
    return this.handle(channelConfigId, secret, payload);
  }

  private async handle(channelConfigId: string, secret: string, payload: any) {
    const channel = await this.channels.findByIdUnscoped(channelConfigId);
    if (!channel || !timingSafeStringEqual(secret ?? '', channel.config?.webhookSecret ?? '')) {
      this.logger.warn(`Unauthorized webhook for channel ${channelConfigId}`);
      throw new UnauthorizedException();
    }

    const event: string = payload?.event ?? '';

    if (event === 'qrcode.updated') {
      const base64 = payload.data?.qrcode?.base64 ?? payload.data?.base64 ?? '';
      if (base64) {
        await this.evolution.saveQrCode(channelConfigId, base64);
        this.logger.log(`QR code updated for channel ${channelConfigId}`);
      }
      return { ok: true };
    }

    if (event === 'connection.update') {
      const state = payload.data?.state;
      const status = state === 'open' ? 'connected' : state === 'close' ? 'disconnected' : 'error';
      await this.channels.updateStatus(channelConfigId, status);
      this.events.emit('channel.status.changed', { channelConfigId, status, workspaceId: channel.workspaceId });
      return { ok: true };
    }

    if (event === 'messages.upsert' && payload.data?.key && !payload.data.key.fromMe) {
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
