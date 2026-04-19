import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ChannelConfig } from '../channels/entities/channel-config.entity';

@Injectable()
export class PlatformChannelService {
  private readonly logger = new Logger(PlatformChannelService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(ChannelConfig) private readonly channelRepo: Repository<ChannelConfig>,
  ) {}

  private get ownerEmails(): string[] {
    const raw = this.config.get<string>('PLATFORM_OTP_EMAIL') || this.config.get<string>('PLATFORM_ADMIN_EMAILS') || 'owner@flowcrm.com';
    return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  }

  async findOwnerChannel(): Promise<ChannelConfig | null> {
    const emails = this.ownerEmails;
    const owner = await this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.email) IN (:...emails)', { emails })
      .orderBy('u.createdAt', 'ASC')
      .getOne();

    if (!owner) {
      this.logger.warn(`Owner OTP user not found for emails: ${emails.join(', ')}`);
      return null;
    }

    const channel = await this.channelRepo.findOne({
      where: { workspaceId: owner.workspaceId, active: true, status: 'connected' },
    });

    if (!channel) {
      this.logger.warn(`No connected channel for owner workspace ${owner.workspaceId}`);
    }
    return channel ?? null;
  }

  async requireOwnerChannel(): Promise<ChannelConfig> {
    const channel = await this.findOwnerChannel();
    if (!channel) {
      throw new InternalServerErrorException(
        'Canal de envio de OTP não configurado. Peça ao administrador para conectar a instância WhatsApp do owner.',
      );
    }
    return channel;
  }
}
