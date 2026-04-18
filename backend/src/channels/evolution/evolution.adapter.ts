import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelAdapter, SendMessageOptions, SendMessageResult } from '../channel-adapter.interface';
import { ChannelConfig } from '../entities/channel-config.entity';

@Injectable()
export class EvolutionAdapter implements ChannelAdapter {
  readonly type = 'evolution' as const;
  private logger = new Logger(EvolutionAdapter.name);

  constructor(
    private config: ConfigService,
    @InjectRepository(ChannelConfig) private repo: Repository<ChannelConfig>,
  ) {}

  async sendMessage(opts: SendMessageOptions): Promise<SendMessageResult> {
    const channel = await this.repo.findOneByOrFail({ id: opts.channelConfigId });
    const instance = channel.config.instance;
    const apiKey = channel.config.apiKey;
    const baseUrl = this.config.getOrThrow<string>('EVOLUTION_API_URL');

    try {
      const res = await axios.post(
        `${baseUrl}/message/sendText/${instance}`,
        { number: opts.to, text: opts.body },
        { headers: { apikey: apiKey }, timeout: 15000 },
      );
      return {
        externalMessageId: res.data?.key?.id ?? `evo-${Date.now()}`,
        status: 'sent',
      };
    } catch (err: any) {
      this.logger.error(`Evolution send failed for channel ${channel.id}: ${err.message}`);
      return { externalMessageId: '', status: 'failed', error: err.message };
    }
  }

  async getQrCode(channelConfigId: string): Promise<{ base64: string; pairingCode?: string }> {
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    const instance = channel.config.instance;
    const apiKey = channel.config.apiKey;
    const baseUrl = this.config.getOrThrow<string>('EVOLUTION_API_URL');

    const res = await axios.get(
      `${baseUrl}/instance/connect/${instance}`,
      { headers: { apikey: apiKey }, timeout: 15000 },
    );
    return {
      base64: res.data?.base64 ?? res.data?.qrcode?.base64 ?? '',
      pairingCode: res.data?.pairingCode,
    };
  }

  async createInstance(channelConfigId: string, webhookUrl: string): Promise<void> {
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    const instance = channel.config.instance;
    const apiKey = this.config.getOrThrow<string>('EVOLUTION_GLOBAL_API_KEY');
    const baseUrl = this.config.getOrThrow<string>('EVOLUTION_API_URL');

    await axios.post(
      `${baseUrl}/instance/create`,
      {
        instanceName: instance,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: webhookUrl,
          byEvents: true,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        },
      },
      { headers: { apikey: apiKey }, timeout: 20000 },
    );
  }
}
