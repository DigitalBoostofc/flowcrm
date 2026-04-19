import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelConfig, ChannelType, ChannelStatus } from './entities/channel-config.entity';
import { ChannelAdapter, SendMessageOptions, SendMessageResult } from './channel-adapter.interface';
import { CreateChannelDto } from './dto/create-channel.dto';
import { EvolutionAdapter } from './evolution/evolution.adapter';
import { UazapiAdapter } from './uazapi/uazapi.adapter';
import { MetaAdapter } from './meta/meta.adapter';

@Injectable()
export class ChannelsService {
  private adapters = new Map<ChannelType, ChannelAdapter>();

  constructor(
    @InjectRepository(ChannelConfig) private repo: Repository<ChannelConfig>,
    evolution: EvolutionAdapter,
    uazapi: UazapiAdapter,
    meta: MetaAdapter,
  ) {
    this.adapters.set('evolution', evolution);
    this.adapters.set('uazapi', uazapi);
    this.adapters.set('meta', meta);
  }

  async send(opts: SendMessageOptions): Promise<SendMessageResult> {
    const config = await this.repo.findOne({ where: { id: opts.channelConfigId, active: true } });
    if (!config) throw new NotFoundException('Canal não encontrado ou inativo');
    const adapter = this.adapters.get(config.type);
    if (!adapter) throw new BadRequestException(`Adapter ${config.type} não registrado`);
    return adapter.sendMessage(opts);
  }

  create(dto: CreateChannelDto): Promise<ChannelConfig> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<ChannelConfig[]> {
    return this.repo.find();
  }

  async findById(id: string): Promise<ChannelConfig> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Canal não encontrado');
    return c;
  }

  async updateStatus(id: string, status: ChannelStatus): Promise<void> {
    await this.repo.update(id, { status });
  }

  async remove(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  async getQrCode(id: string): Promise<{ base64: string; pairingCode?: string }> {
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

  async provisionInstance(id: string, webhookUrl: string): Promise<void> {
    const channel = await this.findById(id);
    if (channel.type === 'uazapi') {
      const adapter = this.adapters.get('uazapi') as unknown as UazapiAdapter;
      await adapter.connectSession(id, webhookUrl);
      return;
    }
    if (channel.type === 'evolution') {
      const adapter = this.adapters.get('evolution') as EvolutionAdapter;
      await adapter.createInstance(id, webhookUrl);
      return;
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
