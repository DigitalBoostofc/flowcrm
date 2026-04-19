import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
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

  private get adminToken(): string {
    return this.config.getOrThrow<string>('UAZAPI_ADMIN_TOKEN');
  }

  private adminHeaders() {
    return { admintoken: this.adminToken, 'Content-Type': 'application/json' };
  }

  private instanceHeaders(token: string) {
    return { token, 'Content-Type': 'application/json' };
  }

  /** Cria instância no uazapiGO via admintoken e salva o token no canal. */
  private async createInstance(channelConfigId: string): Promise<string> {
    const instanceName = `flowcrm-${channelConfigId.slice(0, 8)}`;

    const res = await axios.post(
      `${this.baseUrl}/instance/create`,
      { name: instanceName, systemName: 'FlowCRM' },
      { headers: this.adminHeaders(), timeout: 20000 },
    );

    const instanceToken: string = res.data?.token ?? res.data?.instance?.token;
    if (!instanceToken) throw new Error('uazapiGO não retornou token da instância');

    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    channel.config = { ...channel.config, instanceToken, instanceName };
    await this.repo.save(channel);

    this.logger.log(`Instância ${instanceName} criada para canal ${channelConfigId}`);
    return instanceToken;
  }

  /** Garante que o canal tem um token válido, recriando a instância se necessário. */
  private async ensureToken(channelConfigId: string): Promise<string> {
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    const existing = channel.config.instanceToken as string | undefined;

    if (existing) {
      try {
        await axios.get(`${this.baseUrl}/instance/status`, {
          headers: this.instanceHeaders(existing),
          timeout: 12000,
        });
        return existing;
      } catch (err: any) {
        const status = (err as AxiosError)?.response?.status;
        if (status === 401) {
          this.logger.warn(`Token expirado para canal ${channelConfigId}, recriando instância...`);
        } else {
          // Timeout ou erro de rede: tenta reconectar com token existente em vez de recriar
          this.logger.warn(`Status check falhou (${err.message}), tentando reconectar com token existente`);
          return existing;
        }
      }
    }

    return this.createInstance(channelConfigId);
  }

  /** Configura webhook + conecta sessão → retorna QR code. */
  async connectSession(channelConfigId: string, webhookUrl: string): Promise<string> {
    const token = await this.ensureToken(channelConfigId);

    // Configura webhook com eventos corretos e exclusões
    await axios.post(
      `${this.baseUrl}/webhook`,
      {
        url: webhookUrl,
        enabled: true,
        events: ['messages', 'qrcode', 'connection'],
        excludeMessages: ['wasSentByApi', 'isGroupYes'],
      },
      { headers: this.instanceHeaders(token), timeout: 20000 },
    ).catch((err: any) => this.logger.warn(`webhook set: ${err.message}`));

    // Conecta sessão → retorna QR imediatamente
    const res = await axios.post(
      `${this.baseUrl}/instance/connect`,
      {},
      { headers: this.instanceHeaders(token), timeout: 30000 },
    );

    const qrcode: string = res.data?.instance?.qrcode ?? res.data?.qrcode ?? '';
    if (qrcode) await this.saveQrCode(channelConfigId, qrcode);

    return qrcode;
  }

  async sendMessage(opts: SendMessageOptions): Promise<SendMessageResult> {
    try {
      const token = await this.ensureToken(opts.channelConfigId);
      const res = await axios.post(
        `${this.baseUrl}/send/text`,
        { number: opts.to, text: opts.body },
        { headers: this.instanceHeaders(token), timeout: 15000 },
      );
      return {
        externalMessageId: res.data?.id ?? res.data?.key?.id ?? `uza-${Date.now()}`,
        status: 'sent',
      };
    } catch (err: any) {
      this.logger.error(`send failed para ${opts.channelConfigId}: ${err.message}`);
      return { externalMessageId: '', status: 'failed', error: err.message };
    }
  }

  async getQrCode(channelConfigId: string): Promise<{ base64: string; connected: boolean; phone?: string }> {
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    const token = channel.config.instanceToken as string | undefined;

    if (token) {
      try {
        const res = await axios.get(`${this.baseUrl}/instance/status`, {
          headers: this.instanceHeaders(token),
          timeout: 10000,
        });
        const inst = res.data?.instance ?? {};
        const isConnected: boolean = res.data?.status?.connected === true;

        // Sincroniza status com o banco sem depender do webhook
        if (isConnected && channel.status !== 'connected') {
          const phone: string = (inst.owner ?? '').replace('@s.whatsapp.net', '');
          channel.status = 'connected';
          channel.config = {
            ...channel.config,
            connectedPhone: phone,
            profileName: inst.profileName ?? '',
          };
          await this.repo.save(channel);
          return { base64: '', connected: true, phone };
        }

        const fresh: string = inst.qrcode ?? '';
        if (fresh) await this.saveQrCode(channelConfigId, fresh);
        const base64 = fresh || ((channel.config.lastQrCode as string) ?? '');
        return { base64, connected: false };
      } catch (err: any) {
        this.logger.warn(`QR/status fetch: ${err.message}`);
      }
    }

    return { base64: (channel.config.lastQrCode as string) ?? '', connected: false };
  }

  async saveQrCode(channelConfigId: string, base64: string): Promise<void> {
    const channel = await this.repo.findOneByOrFail({ id: channelConfigId });
    channel.config = { ...channel.config, lastQrCode: base64, lastQrAt: new Date().toISOString() };
    await this.repo.save(channel);
  }
}
