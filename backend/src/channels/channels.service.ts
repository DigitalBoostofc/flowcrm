import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChannelConfig, ChannelType, ChannelStatus } from './entities/channel-config.entity';
import { ChannelAdapter, SendMessageOptions, SendMessageResult } from './channel-adapter.interface';
import { CreateChannelDto } from './dto/create-channel.dto';
import { EvolutionAdapter } from './evolution/evolution.adapter';
import { UazapiAdapter } from './uazapi/uazapi.adapter';
import { MetaAdapter } from './meta/meta.adapter';
import { TelegramAdapter } from './telegram/telegram.adapter';
import { TenantContext } from '../common/tenant/tenant-context.service';

const MEDIA_TYPES: Record<string, string> = {
  imageMessage: 'image',
  videoMessage: 'video',
  audioMessage: 'audio',
  pttMessage: 'audio',
  documentMessage: 'document',
  stickerMessage: 'sticker',
  image: 'image',
  video: 'video',
  audio: 'audio',
  ptt: 'audio',
  document: 'document',
  sticker: 'sticker',
};

@Injectable()
export class ChannelsService {
  private adapters = new Map<ChannelType, ChannelAdapter>();

  constructor(
    @InjectRepository(ChannelConfig) private repo: Repository<ChannelConfig>,
    private readonly tenant: TenantContext,
    private readonly events: EventEmitter2,
    private readonly uazapiAdapter: UazapiAdapter,
    evolution: EvolutionAdapter,
    uazapi: UazapiAdapter,
    meta: MetaAdapter,
    telegram: TelegramAdapter,
  ) {
    this.adapters.set('evolution', evolution);
    this.adapters.set('uazapi', uazapi);
    this.adapters.set('meta', meta);
    this.adapters.set('telegram', telegram);
  }

  async send(opts: SendMessageOptions): Promise<SendMessageResult> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const config = await this.repo.findOne({ where: { id: opts.channelConfigId, workspaceId, active: true } });
    if (!config) throw new NotFoundException('Canal não encontrado ou inativo');
    const adapter = this.adapters.get(config.type);
    if (!adapter) throw new BadRequestException(`Adapter ${config.type} não registrado`);
    return adapter.sendMessage(opts);
  }

  async create(dto: CreateChannelDto): Promise<ChannelConfig> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const existing = await this.repo.findOne({
      where: { workspaceId, type: dto.type as ChannelType, active: true },
    });
    if (existing) {
      throw new BadRequestException('Já existe um canal WhatsApp ativo. Delete o atual antes de criar um novo.');
    }
    return this.repo.save(this.repo.create({ ...dto, workspaceId }));
  }

  findAll(): Promise<ChannelConfig[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({ where: { workspaceId, active: true } });
  }

  async findById(id: string): Promise<ChannelConfig> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const c = await this.repo.findOne({ where: { id, workspaceId } });
    if (!c) throw new NotFoundException('Canal não encontrado');
    return c;
  }

  findByIdUnscoped(id: string): Promise<ChannelConfig | null> {
    return this.repo.findOne({ where: { id } });
  }

  async updateStatus(id: string, status: ChannelStatus): Promise<void> {
    await this.repo.update(id, { status });
  }

  async updateConfig(id: string, extra: Record<string, string>): Promise<void> {
    const channel = await this.repo.findOne({ where: { id } });
    if (!channel) throw new NotFoundException('Canal não encontrado');
    channel.config = { ...channel.config, ...extra };
    await this.repo.save(channel);
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.repo.update({ id, workspaceId }, { active: false });
  }

  async getQrCode(id: string): Promise<{ base64: string; pairingCode?: string; connected?: boolean; phone?: string }> {
    const channel = await this.findById(id);
    if (channel.type === 'uazapi') {
      const adapter = this.adapters.get('uazapi') as unknown as UazapiAdapter;
      return adapter.getQrCode(id);
    }
    if (channel.type === 'evolution') {
      const adapter = this.adapters.get('evolution') as EvolutionAdapter;
      return adapter.getQrCode(id);
    }
    throw new BadRequestException('QR code não disponível para este tipo de canal');
  }

  async provisionInstance(id: string, webhookUrl: string): Promise<{ qrCode?: string }> {
    const channel = await this.findById(id);
    if (channel.type === 'uazapi') {
      const adapter = this.adapters.get('uazapi') as unknown as UazapiAdapter;
      const qrCode = await adapter.connectSession(id, webhookUrl);
      return { qrCode: qrCode || undefined };
    }
    if (channel.type === 'evolution') {
      const adapter = this.adapters.get('evolution') as EvolutionAdapter;
      await adapter.createInstance(id, webhookUrl);
      return {};
    }
    throw new BadRequestException('Provisionamento não disponível para este tipo de canal');
  }

  async refreshWebhook(id: string, webhookUrl: string): Promise<void> {
    const channel = await this.findById(id);
    if (channel.type === 'evolution') {
      const adapter = this.adapters.get('evolution') as EvolutionAdapter;
      await adapter.updateWebhook(id, webhookUrl);
      return;
    }
    if (channel.type === 'uazapi') {
      const adapter = this.adapters.get('uazapi') as unknown as UazapiAdapter;
      await adapter.connectSession(id, webhookUrl);
      return;
    }
    throw new BadRequestException('Refresh webhook não disponível para este tipo de canal');
  }

  async sendTyping(id: string, to: string, type: 'composing' | 'paused' | 'recording' = 'composing'): Promise<void> {
    const channel = await this.findById(id);
    if (channel.type === 'uazapi') {
      const adapter = this.adapters.get('uazapi') as unknown as UazapiAdapter;
      await adapter.sendTyping(id, to, type);
    }
  }

  async markRead(id: string, chatId: string): Promise<void> {
    const channel = await this.findById(id);
    if (channel.type === 'uazapi') {
      const adapter = this.adapters.get('uazapi') as unknown as UazapiAdapter;
      await adapter.markRead(id, chatId);
    }
  }

  async reactToMessage(id: string, messageId: string, emoji: string): Promise<void> {
    const channel = await this.findById(id);
    if (channel.type === 'uazapi') {
      const adapter = this.adapters.get('uazapi') as unknown as UazapiAdapter;
      await adapter.reactToMessage(id, messageId, emoji);
    }
  }

  async deleteMessage(id: string, messageId: string): Promise<void> {
    const channel = await this.findById(id);
    if (channel.type === 'uazapi') {
      const adapter = this.adapters.get('uazapi') as unknown as UazapiAdapter;
      await adapter.deleteMessage(id, messageId);
    }
  }

  async checkNumber(id: string, phone: string): Promise<{ exists: boolean; jid?: string }> {
    const channel = await this.findById(id);
    if (channel.type === 'uazapi') {
      const adapter = this.adapters.get('uazapi') as unknown as UazapiAdapter;
      return adapter.checkNumber(id, phone);
    }
    throw new BadRequestException('checkNumber não disponível para este tipo de canal');
  }

  async getWaLimits(id: string): Promise<Record<string, unknown>> {
    const channel = await this.findById(id);
    if (channel.type === 'uazapi') {
      const adapter = this.adapters.get('uazapi') as unknown as UazapiAdapter;
      return adapter.getWaLimits(id);
    }
    throw new BadRequestException('WA limits não disponível para este tipo de canal');
  }

  async syncChatHistory(channelConfigId: string, chatId: string, count = 50): Promise<{ queued: number }> {
    const channel = await this.findByIdUnscoped(channelConfigId);
    if (!channel || channel.type !== 'uazapi') return { queued: 0 };

    const msgs: any[] = await this.uazapiAdapter.fetchChatMessages(channelConfigId, chatId, count);
    let queued = 0;

    for (const msg of msgs) {
      const fromMe: boolean = msg?.fromMe ?? msg?.key?.fromMe ?? false;
      const rawMsgType: string = msg?.type ?? msg?.messageType ?? 'conversation';
      const mediaType = MEDIA_TYPES[rawMsgType];

      const text: string =
        msg?.text ?? msg?.content ?? msg?.caption ??
        msg?.message?.conversation ?? msg?.message?.extendedTextMessage?.text ??
        msg?.message?.imageMessage?.caption ?? msg?.message?.videoMessage?.caption ??
        msg?.message?.documentMessage?.caption ?? '';

      const body = text || (mediaType ? `[${rawMsgType.replace('Message', '')}]` : '');
      if (!body && !mediaType) continue;

      const chatid: string = msg?.chatid ?? msg?.key?.remoteJid ?? '';
      const from = chatid.replace('@s.whatsapp.net', '').replace(/@lid$/, '');
      if (!from) continue;

      const externalMessageId: string = msg?.messageid ?? msg?.key?.id ?? '';
      if (!externalMessageId) continue;

      const rawTs: number = msg?.messageTimestamp ?? Date.now();
      const receivedAt = new Date(rawTs > 1e12 ? rawTs : rawTs * 1000);

      const eventPayload = {
        channelConfigId,
        channelType: 'uazapi',
        externalMessageId,
        from,
        fromName: fromMe ? null : (msg?.senderName ?? msg?.pushName ?? null),
        body,
        receivedAt,
        messageType: mediaType ?? 'text',
        mediaUrl: msg?.url ?? msg?.mediaUrl ?? msg?.fileUrl ?? msg?.fileURL ??
          msg?.message?.imageMessage?.url ?? msg?.message?.videoMessage?.url ??
          msg?.message?.audioMessage?.url ?? msg?.message?.documentMessage?.url ?? undefined,
        mediaMimeType: msg?.mimetype ?? msg?.mimeType ?? msg?.message?.imageMessage?.mimetype ??
          msg?.message?.audioMessage?.mimetype ?? msg?.message?.documentMessage?.mimetype ?? undefined,
        mediaFileName: msg?.fileName ?? msg?.filename ?? msg?.message?.documentMessage?.fileName ?? undefined,
      };

      this.events.emit(fromMe ? 'message.outbound.fromphone' : 'message.inbound.received', eventPayload);
      queued++;
    }

    return { queued };
  }
}
