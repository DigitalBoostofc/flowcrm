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

  private async createInstance(channelConfigId: string): Promise<string> {
    const instanceName = `flowcrm-${channelConfigId.slice(0, 8)}`;

    const res = await axios.post(
      `${this.baseUrl}/instance/create`,
      { name: instanceName, systemName: 'AppexCRM' },
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

  async ensureToken(channelConfigId: string): Promise<string> {
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
          this.logger.warn(`Status check falhou (${err.message}), tentando reconectar com token existente`);
          return existing;
        }
      }
    }

    return this.createInstance(channelConfigId);
  }

  async connectSession(channelConfigId: string, webhookUrl: string): Promise<string> {
    const token = await this.ensureToken(channelConfigId);

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

      // Media send
      if (opts.mediaType) {
        const mediaPayload: Record<string, unknown> = {
          number: opts.to,
          type: opts.mediaType,
          caption: opts.mediaCaption ?? '',
        };

        if (opts.base64) {
          mediaPayload.base64 = opts.base64;
        } else if (opts.mediaUrl) {
          mediaPayload.url = opts.mediaUrl;
        }

        if (opts.mediaFileName) mediaPayload.fileName = opts.mediaFileName;

        const endpoint = opts.mediaType === 'audio' ? '/send/audio' : '/send/media';
        if (opts.mediaType === 'audio') {
          delete mediaPayload.type;
          delete mediaPayload.caption;
          mediaPayload.ptt = true;
        }

        const res = await axios.post(
          `${this.baseUrl}${endpoint}`,
          mediaPayload,
          { headers: this.instanceHeaders(token), timeout: 30000 },
        );
        return {
          externalMessageId: res.data?.id ?? res.data?.key?.id ?? `uza-${Date.now()}`,
          status: 'sent',
        };
      }

      // Text send
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

  async sendTyping(channelConfigId: string, to: string, type: 'composing' | 'paused' | 'recording' = 'composing'): Promise<void> {
    try {
      const token = await this.ensureToken(channelConfigId);
      await axios.post(
        `${this.baseUrl}/message/presence`,
        { number: to, type },
        { headers: this.instanceHeaders(token), timeout: 8000 },
      );
    } catch (err: any) {
      this.logger.warn(`sendTyping failed: ${err.message}`);
    }
  }

  async markRead(channelConfigId: string, chatId: string): Promise<void> {
    try {
      const token = await this.ensureToken(channelConfigId);
      const normalizedId = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
      await axios.post(
        `${this.baseUrl}/chat/read`,
        { chatid: normalizedId },
        { headers: this.instanceHeaders(token), timeout: 8000 },
      );
    } catch (err: any) {
      this.logger.warn(`markRead failed: ${err.message}`);
    }
  }

  async reactToMessage(channelConfigId: string, messageId: string, emoji: string): Promise<void> {
    try {
      const token = await this.ensureToken(channelConfigId);
      await axios.post(
        `${this.baseUrl}/message/react`,
        { messageid: messageId, text: emoji },
        { headers: this.instanceHeaders(token), timeout: 10000 },
      );
    } catch (err: any) {
      this.logger.warn(`reactToMessage failed: ${err.message}`);
    }
  }

  async deleteMessage(channelConfigId: string, messageId: string, forEveryone = true): Promise<void> {
    try {
      const token = await this.ensureToken(channelConfigId);
      await axios.post(
        `${this.baseUrl}/message/delete`,
        { messageid: messageId, forEveryone },
        { headers: this.instanceHeaders(token), timeout: 10000 },
      );
    } catch (err: any) {
      this.logger.warn(`deleteMessage failed: ${err.message}`);
    }
  }

  async checkNumber(channelConfigId: string, phone: string): Promise<{ exists: boolean; jid?: string }> {
    try {
      const token = await this.ensureToken(channelConfigId);
      const res = await axios.post(
        `${this.baseUrl}/chat/check`,
        { number: phone },
        { headers: this.instanceHeaders(token), timeout: 15000 },
      );
      const exists: boolean = res.data?.exists ?? res.data?.onWhatsapp ?? false;
      const jid: string = res.data?.jid ?? res.data?.id ?? '';
      return { exists, jid };
    } catch (err: any) {
      this.logger.warn(`checkNumber failed: ${err.message}`);
      return { exists: false };
    }
  }

  async fetchChatMessages(channelConfigId: string, chatId: string, count = 50): Promise<any[]> {
    try {
      const token = await this.ensureToken(channelConfigId);
      const normalizedId = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
      const res = await axios.post(
        `${this.baseUrl}/message/find`,
        { chatid: normalizedId, limit: count, offset: 0 },
        { headers: this.instanceHeaders(token), timeout: 30000 },
      );
      const data = res.data;
      return Array.isArray(data?.messages) ? data.messages : (Array.isArray(data) ? data : []);
    } catch (err: any) {
      this.logger.warn(`fetchChatMessages failed: ${err.message}`);
      return [];
    }
  }

  async downloadMedia(channelConfigId: string, messageid: string): Promise<{ fileURL?: string; mimetype?: string }> {
    try {
      const token = await this.ensureToken(channelConfigId);
      const res = await axios.post(
        `${this.baseUrl}/message/download`,
        { id: messageid, return_link: true, generate_mp3: true },
        { headers: this.instanceHeaders(token), timeout: 12000 },
      );
      return { fileURL: res.data?.fileURL ?? undefined, mimetype: res.data?.mimetype ?? undefined };
    } catch (err: any) {
      this.logger.warn(`downloadMedia failed for ${messageid}: ${err.message}`);
      return {};
    }
  }

  async getWaLimits(channelConfigId: string): Promise<Record<string, unknown>> {
    try {
      const token = await this.ensureToken(channelConfigId);
      const res = await axios.get(
        `${this.baseUrl}/instance/wa_messages_limits`,
        { headers: this.instanceHeaders(token), timeout: 10000 },
      );
      return res.data ?? {};
    } catch (err: any) {
      this.logger.warn(`getWaLimits failed: ${err.message}`);
      return {};
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
