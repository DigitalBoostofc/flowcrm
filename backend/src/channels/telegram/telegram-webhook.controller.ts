import { Body, Controller, Headers, Logger, Param, ParseUUIDPipe, Post, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiTags } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { ChannelsService } from '../channels.service';

interface TelegramUpdate {
  update_id?: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
    chat: { id: number };
    date: number;
    text?: string;
  };
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

@ApiTags('telegram-webhook')
@Controller('webhooks/telegram')
export class TelegramWebhookController {
  private logger = new Logger(TelegramWebhookController.name);

  constructor(
    private readonly channels: ChannelsService,
    private readonly events: EventEmitter2,
  ) {}

  @Post(':channelConfigId')
  async receive(
    @Param('channelConfigId', new ParseUUIDPipe()) channelConfigId: string,
    @Headers('x-telegram-bot-api-secret-token') secretHeader: string | undefined,
    @Body() body: TelegramUpdate,
  ): Promise<{ ok: boolean }> {
    const channel = await this.channels.findByIdUnscoped(channelConfigId);
    if (!channel || channel.type !== 'telegram' || !channel.active) {
      throw new UnauthorizedException('Canal Telegram inválido');
    }

    const expectedSecret = channel.config?.secretToken;
    if (expectedSecret) {
      if (!secretHeader || !timingSafeStringEqual(secretHeader, expectedSecret)) {
        this.logger.warn(`Telegram webhook ${channelConfigId}: invalid secret token`);
        throw new UnauthorizedException('Secret token inválido');
      }
    }

    const msg = body?.message;
    if (!msg || typeof msg.text !== 'string' || !msg.from || !msg.chat) {
      // ignora updates sem texto (foto, sticker, callback, etc)
      return { ok: true };
    }

    const fromName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ').trim() || msg.from.username;

    this.events.emit('message.inbound.received', {
      channelType: 'telegram',
      channelConfigId,
      externalMessageId: `tg-${msg.message_id}`,
      from: String(msg.chat.id),
      fromName,
      body: msg.text,
      receivedAt: new Date(msg.date * 1000),
    });

    return { ok: true };
  }
}
