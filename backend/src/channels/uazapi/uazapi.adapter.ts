import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelAdapter, SendMessageOptions, SendMessageResult } from '../channel-adapter.interface';
import { ChannelConfig } from '../entities/channel-config.entity';

@Injectable()
export class UazapiAdapter implements ChannelAdapter {
  readonly type = 'uazapi' as const;
  private logger = new Logger(UazapiAdapter.name);

  constructor(
    @InjectRepository(ChannelConfig) private repo: Repository<ChannelConfig>,
  ) {}

  private headers(token: string) {
    return { Token: token, 'Content-Type': 'application/json' };
  }

  async sendMessage(opts: SendMessageOptions): Promise<SendMessageResult> {
    const channel = await this.repo.findOneByOrFail({ id: opts.channelConfigId });
    const { baseUrl, token } = channel.config;
    try {
      const res = await axios.post(
        `${baseUrl}/chat/send/text`,
        { Phone: opts.to, Body: opts.body },
        { headers: this.headers(token), timeout: 15000 },
      );
      return {
        externalMessageId: res.data?.data?.Id ?? `uza-${Date.now()}`,
        status: 'sent',
      };
    } catch (err: any) {
      this.logger.error(`uazapi send failed for channel ${opts.channelConfigId}: ${err.message}`);
      return { externalMessageId: '', status: 'failed', error: err.message };
    }
  }

  async getQrCode(channelConfigId: string): Promise<{ base64: string }> {
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    const { baseUrl, token } = channel.config;
    try {
      const res = await axios.get(`${baseUrl}/session/qr`, {
        headers: { Token: token },
        timeout: 15000,
        responseType: 'arraybuffer',
      });
      const contentType = res.headers['content-type'] ?? '';
      if (contentType.includes('image/')) {
        const base64 = `data:image/png;base64,${Buffer.from(res.data).toString('base64')}`;
        return { base64 };
      }
      // JSON response
      const json = JSON.parse(Buffer.from(res.data).toString('utf8'));
      const base64 = json?.data ?? json?.qr ?? '';
      if (base64) return { base64 };
    } catch (err: any) {
      this.logger.warn(`uazapi QR fetch failed for ${channelConfigId}: ${err.message}`);
    }
    return {
      base64: typeof channel.config.lastQrCode === 'string' ? channel.config.lastQrCode : '',
    };
  }

  async connectSession(channelConfigId: string, webhookUrl: string): Promise<void> {
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    const { baseUrl, token } = channel.config;

    await axios.post(
      `${baseUrl}/webhook`,
      { webhookURL: webhookUrl },
      { headers: this.headers(token), timeout: 15000 },
    );

    try {
      await axios.post(
        `${baseUrl}/session/connect`,
        { Subscribe: ['Message'], Immediate: false },
        { headers: this.headers(token), timeout: 20000 },
      );
    } catch (err: any) {
      // connect may return non-2xx when already connecting; ignore
      this.logger.warn(`uazapi connect response for ${channelConfigId}: ${err.message}`);
    }
  }

  async saveQrCode(channelConfigId: string, base64: string): Promise<void> {
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    channel.config = { ...channel.config, lastQrCode: base64, lastQrAt: new Date().toISOString() };
    await this.repo.save(channel);
  }
}
