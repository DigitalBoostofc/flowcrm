import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private config: ConfigService,
    @InjectRepository(ChannelConfig) private repo: Repository<ChannelConfig>,
  ) {}

  private get baseUrl(): string {
    return this.config.getOrThrow<string>('UAZAPI_BASE_URL').replace(/\/$/, '');
  }

  private get instanceToken(): string {
    return this.config.getOrThrow<string>('UAZAPI_TOKEN');
  }

  private headers() {
    return { token: this.instanceToken, 'Content-Type': 'application/json' };
  }

  /**
   * Configura webhook + conecta sessão WhatsApp.
   * Retorna o QR code já na primeira chamada para exibir imediatamente na tela.
   */
  async connectSession(channelConfigId: string, webhookUrl: string): Promise<string> {
    // 1. Configura webhook para receber atualizações de QR e mensagens
    await axios.post(
      `${this.baseUrl}/webhook`,
      { url: webhookUrl, enabled: true, events: ['message', 'qrcode', 'connection'] },
      { headers: this.headers(), timeout: 15000 },
    ).catch((err: any) => this.logger.warn(`webhook: ${err.message}`));

    // 2. Conecta sessão → já retorna QR code na resposta
    const res = await axios.post(
      `${this.baseUrl}/instance/connect`,
      {},
      { headers: this.headers(), timeout: 20000 },
    );

    const qrcode: string = res.data?.instance?.qrcode ?? res.data?.qrcode ?? '';

    if (qrcode) {
      await this.saveQrCode(channelConfigId, qrcode);
    }

    return qrcode;
  }

  async sendMessage(opts: SendMessageOptions): Promise<SendMessageResult> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/send/text`,
        { number: opts.to, text: opts.body },
        { headers: this.headers(), timeout: 15000 },
      );
      return {
        externalMessageId: res.data?.id ?? res.data?.key?.id ?? `uza-${Date.now()}`,
        status: 'sent',
      };
    } catch (err: any) {
      this.logger.error(`uazapi send failed para ${opts.channelConfigId}: ${err.message}`);
      return { externalMessageId: '', status: 'failed', error: err.message };
    }
  }

  async getQrCode(channelConfigId: string): Promise<{ base64: string }> {
    // Tenta buscar QR atualizado diretamente da instância
    try {
      const res = await axios.get(
        `${this.baseUrl}/instance/status`,
        { headers: this.headers(), timeout: 10000 },
      );
      const fresh: string = res.data?.instance?.qrcode ?? '';
      if (fresh) {
        await this.saveQrCode(channelConfigId, fresh);
        return { base64: fresh };
      }
    } catch (err: any) {
      this.logger.warn(`QR fetch: ${err.message}`);
    }

    // Fallback: último QR salvo no banco
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    return { base64: (channel.config.lastQrCode as string) ?? '' };
  }

  async saveQrCode(channelConfigId: string, base64: string): Promise<void> {
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    channel.config = { ...channel.config, lastQrCode: base64, lastQrAt: new Date().toISOString() };
    await this.repo.save(channel);
  }
}
