import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelConfig, ChannelType, ChannelStatus } from './entities/channel-config.entity';
import { ChannelAdapter, SendMessageOptions, SendMessageResult } from './channel-adapter.interface';
import { CreateChannelDto } from './dto/create-channel.dto';
import { EvolutionAdapter } from './evolution/evolution.adapter';
import { UazapiAdapter } from './uazapi/uazapi.adapter';
import { MetaAdapter } from './meta/meta.adapter';
import { TelegramAdapter } from './telegram/telegram.adapter';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class ChannelsService {
  private adapters = new Map<ChannelType, ChannelAdapter>();

  constructor(
    @InjectRepository(ChannelConfig) private repo: Repository<ChannelConfig>,
    private readonly tenant: TenantContext,
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
}
