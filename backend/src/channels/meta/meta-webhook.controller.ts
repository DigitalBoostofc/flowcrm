import { Body, Controller, Get, Logger, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { MetaSignatureGuard } from './meta-signature.guard';

function timingSafeStringEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

@Controller('webhooks/meta')
export class MetaWebhookController {
  private logger = new Logger(MetaWebhookController.name);

  constructor(private config: ConfigService, private events: EventEmitter2) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const expected = this.config.getOrThrow<string>('META_VERIFY_TOKEN');
    if (mode === 'subscribe' && timingSafeStringEqual(token ?? '', expected)) {
      return challenge;
    }
    return '';
  }

  @Post()
  @UseGuards(MetaSignatureGuard)
  receive(@Body() body: any) {
    if (body.object !== 'whatsapp_business_account') return { ok: true };

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        for (const msg of value.messages ?? []) {
          if (msg.type !== 'text') continue;
          this.events.emit('message.inbound.received', {
            channelType: 'meta',
            channelConfigId: null,
            phoneNumberId,
            externalMessageId: msg.id,
            from: msg.from,
            fromName: value.contacts?.[0]?.profile?.name,
            body: msg.text?.body ?? '',
            receivedAt: new Date(Number(msg.timestamp) * 1000),
          });
        }
      }
    }
    return { ok: true };
  }
}
