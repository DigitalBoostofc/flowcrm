import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { ChannelAdapter, SendMessageOptions, SendMessageResult } from '../channel-adapter.interface';
import { ChannelConfig } from '../entities/channel-config.entity';

@Injectable()
export class UazapiAdapter implements ChannelAdapter {
  readonly type = 'uazapi' as const;
  private logger = new Logger(UazapiAdapter.name);

  constructor(
    private config: ConfigService,
    @InjectRepository(ChannelConfig) private repo: Repository<ChannelConfig>,
  ) {}

  private get baseUrl(): string {
    return this.config.getOrThrow<string>('UAZAPI_BASE_URL').replace(/\/$/, '');
  }

  private get adminToken(): string {
    return this.config.getOrThrow<string>('UAZAPI_ADMIN_TOKEN');
  }

  private instanceHeaders(token: string) {
    return { Token: token, 'Content-Type': 'application/json' };
  }

  private adminHeaders() {
    return { Authorization: this.adminToken, 'Content-Type': 'application/json' };
  }

  /** Cria instância no uazapiGO e persiste o token gerado no config do canal. */
  async createInstance(channelConfigId: string, webhookUrl: string): Promise<void> {
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });

    // Gera token único para esta instância
    const instanceToken = randomBytes(24).toString('hex');
    const instanceName = `flowcrm-${channelConfigId.slice(0, 8)}`;

    await axios.post(
      `${this.baseUrl}/admin/users`,
      {
        name: instanceName,
        token: instanceToken,
        webhook: webhookUrl,
        events: 'Message,QrCode,Connected,Disconnected',
      },
      { headers: this.adminHeaders(), timeout: 20000 },
    );

    channel.config = {
      ...channel.config,
      instanceToken,
      instanceName,
      webhookUrl,
    };
    await this.repo.save(channel);
    this.logger.log(`Instância ${instanceName} criada para canal ${channelConfigId}`);
  }

  /** Conecta sessão WhatsApp e configura webhook — dispara geração do QR. */
  async connectSession(channelConfigId: string, webhookUrl: string): Promise<void> {
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    const token = channel.config.instanceToken;

    if (!token) {
      await this.createInstance(channelConfigId, webhookUrl);
      return this.connectSession(channelConfigId, webhookUrl);
    }

    // Garante webhook atualizado
    await axios.post(
      `${this.baseUrl}/webhook`,
      { webhookURL: webhookUrl },
      { headers: this.instanceHeaders(token), timeout: 15000 },
    ).catch((err: any) => this.logger.warn(`webhook update: ${err.message}`));

    // Inicia sessão → uazapiGO vai emitir QrCode via webhook
    try {
      await axios.post(
        `${this.baseUrl}/session/connect`,
        { Subscribe: ['Message'], Immediate: false },
        { headers: this.instanceHeaders(token), timeout: 20000 },
      );
    } catch (err: any) {
      // Pode retornar não-2xx quando já está conectando; não é erro fatal
      this.logger.warn(`session/connect para ${channelConfigId}: ${err.message}`);
    }
  }

  async sendMessage(opts: SendMessageOptions): Promise<SendMessageResult> {
    const channel = await this.repo.findOneByOrFail({ id: opts.channelConfigId });
    const token = channel.config.instanceToken;
    try {
      const res = await axios.post(
        `${this.baseUrl}/chat/send/text`,
        { Phone: opts.to, Body: opts.body },
        { headers: this.instanceHeaders(token), timeout: 15000 },
      );
      return {
        externalMessageId: res.data?.data?.Id ?? `uza-${Date.now()}`,
        status: 'sent',
      };
    } catch (err: any) {
      this.logger.error(`uazapi send failed para ${opts.channelConfigId}: ${err.message}`);
      return { externalMessageId: '', status: 'failed', error: err.message };
    }
  }

  async getQrCode(channelConfigId: string): Promise<{ base64: string }> {
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    const token = channel.config.instanceToken;

    if (token) {
      try {
        const res = await axios.get(`${this.baseUrl}/session/qr`, {
          headers: { Token: token },
          timeout: 15000,
          responseType: 'arraybuffer',
        });
        const contentType = (res.headers['content-type'] ?? '') as string;
        if (contentType.includes('image/')) {
          return { base64: `data:image/png;base64,${Buffer.from(res.data as Buffer).toString('base64')}` };
        }
        const json = JSON.parse(Buffer.from(res.data as Buffer).toString('utf8'));
        const base64: string = json?.data ?? json?.qr ?? '';
        if (base64) return { base64 };
      } catch (err: any) {
        this.logger.warn(`QR fetch para ${channelConfigId}: ${err.message}`);
      }
    }

    // Fallback: último QR salvo via webhook
    return { base64: (channel.config.lastQrCode as string) ?? '' };
  }

  async saveQrCode(channelConfigId: string, base64: string): Promise<void> {
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    channel.config = { ...channel.config, lastQrCode: base64, lastQrAt: new Date().toISOString() };
    await this.repo.save(channel);
  }
}
