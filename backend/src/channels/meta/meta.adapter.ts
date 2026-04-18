import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelAdapter, SendMessageOptions, SendMessageResult } from '../channel-adapter.interface';
import { ChannelConfig } from '../entities/channel-config.entity';

@Injectable()
export class MetaAdapter implements ChannelAdapter {
  readonly type = 'meta' as const;
  private logger = new Logger(MetaAdapter.name);

  constructor(@InjectRepository(ChannelConfig) private repo: Repository<ChannelConfig>) {}

  async sendMessage(opts: SendMessageOptions): Promise<SendMessageResult> {
    const channel = await this.repo.findOneByOrFail({ id: opts.channelConfigId });
    const phoneNumberId = channel.config.phoneNumberId;
    const accessToken = channel.config.accessToken;

    try {
      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: opts.to,
          type: 'text',
          text: { body: opts.body },
        },
        { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000 },
      );
      return {
        externalMessageId: res.data?.messages?.[0]?.id ?? '',
        status: 'sent',
      };
    } catch (err: any) {
      const apiErr = err.response?.data?.error?.message ?? err.message;
      this.logger.error(`Meta send failed for channel ${channel.id}: ${apiErr}`);
      return { externalMessageId: '', status: 'failed', error: apiErr };
    }
  }
}
