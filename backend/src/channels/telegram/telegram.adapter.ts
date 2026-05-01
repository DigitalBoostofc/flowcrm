import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelAdapter, SendMessageOptions, SendMessageResult } from '../channel-adapter.interface';
import { ChannelConfig } from '../entities/channel-config.entity';

const TELEGRAM_API = 'https://api.telegram.org';

@Injectable()
export class TelegramAdapter implements ChannelAdapter {
  readonly type = 'telegram' as const;
  private logger = new Logger(TelegramAdapter.name);

  constructor(
    @InjectRepository(ChannelConfig) private repo: Repository<ChannelConfig>,
  ) {}

  async sendMessage(opts: SendMessageOptions): Promise<SendMessageResult> {
    const channel = await this.repo.findOneByOrFail({ id: opts.channelConfigId });
    const botToken = channel.config.botToken;
    if (!botToken) {
      return { externalMessageId: '', status: 'failed', error: 'botToken ausente em config' };
    }

    try {
      const res = await axios.post(
        `${TELEGRAM_API}/bot${botToken}/sendMessage`,
        { chat_id: opts.to, text: opts.body },
        { timeout: 15000 },
      );
      const messageId = res.data?.result?.message_id;
      return {
        externalMessageId: messageId != null ? `tg-${messageId}` : `tg-${Date.now()}`,
        status: 'sent',
      };
    } catch (err: any) {
      const detail = err.response?.data?.description ?? err.message;
      this.logger.error(`Telegram send failed for channel ${channel.id}: ${detail}`);
      return { externalMessageId: '', status: 'failed', error: detail };
    }
  }
}
