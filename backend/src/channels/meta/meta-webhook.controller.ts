import { Body, Controller, Get, Logger, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MetaSignatureGuard } from './meta-signature.guard';

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
    if (mode === 'subscribe' && token === this.config.getOrThrow<string>('META_VERIFY_TOKEN')) {
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
