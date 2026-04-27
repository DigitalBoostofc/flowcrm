import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScheduledMessage } from './entities/scheduled-message.entity';
import { ScheduleMessageDto } from './dto/schedule-message.dto';
import { ChannelConfig } from '../channels/entities/channel-config.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { QUEUE_SCHEDULED } from '../common/queues/queues.module';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class SchedulerService {
  constructor(
    @InjectRepository(ScheduledMessage) private repo: Repository<ScheduledMessage>,
    @InjectRepository(ChannelConfig) private channelRepo: Repository<ChannelConfig>,
    @InjectRepository(Conversation) private conversationRepo: Repository<Conversation>,
    @InjectQueue(QUEUE_SCHEDULED) private queue: Queue,
    private readonly tenant: TenantContext,
  ) {}

  async schedule(dto: ScheduleMessageDto, createdById: string): Promise<ScheduledMessage> {
    const workspaceId = this.tenant.requireWorkspaceId();

    // tenant ownership check on referenced records
    const [conversation, channel] = await Promise.all([
      this.conversationRepo.findOne({ where: { id: dto.conversationId, workspaceId } }),
      this.channelRepo.findOne({ where: { id: dto.channelConfigId, workspaceId, active: true } }),
    ]);
    if (!conversation) throw new NotFoundException('Conversa não encontrada');
    if (!channel) throw new BadRequestException('Canal não encontrado ou inativo');

    const scheduledAt = new Date(dto.scheduledAt);
    const record = await this.repo.save(
      this.repo.create({
        conversationId: dto.conversationId,
        workspaceId,
        body: dto.body,
        channelConfigId: dto.channelConfigId,
        scheduledAt,
        status: 'pending',
        createdById,
      }),
    );

    const delay = Math.max(0, scheduledAt.getTime() - Date.now());
    const job = await this.queue.add(
      'send',
      { scheduledMessageId: record.id },
      { delay },
    );
    await this.repo.update(record.id, { bullJobId: job.id ?? undefined });
    return { ...record, bullJobId: job.id ?? '' };
  }

  async cancel(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const record = await this.repo.findOne({ where: { id, workspaceId } });
    if (!record) throw new NotFoundException('Mensagem agendada não encontrada');
    if (record.status !== 'pending') return;
    if (record.bullJobId) {
      const job = await this.queue.getJob(record.bullJobId);
      if (job) await job.remove();
    }
    await this.repo.update(id, { status: 'cancelled' });
  }

  findAll(): Promise<ScheduledMessage[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({ where: { workspaceId }, order: { scheduledAt: 'ASC' } });
  }

  findByConversation(conversationId: string): Promise<ScheduledMessage[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({
      where: { conversationId, workspaceId },
      order: { scheduledAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ScheduledMessage> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const r = await this.repo.findOne({ where: { id, workspaceId } });
    if (!r) throw new NotFoundException('Mensagem agendada não encontrada');
    return r;
  }

  findOneByIdUnscoped(id: string): Promise<ScheduledMessage | null> {
    return this.repo.findOne({ where: { id } });
  }
}
