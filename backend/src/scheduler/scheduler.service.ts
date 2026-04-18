import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScheduledMessage } from './entities/scheduled-message.entity';
import { ScheduleMessageDto } from './dto/schedule-message.dto';
import { QUEUE_SCHEDULED } from '../common/queues/queues.module';

@Injectable()
export class SchedulerService {
  constructor(
    @InjectRepository(ScheduledMessage) private repo: Repository<ScheduledMessage>,
    @InjectQueue(QUEUE_SCHEDULED) private queue: Queue,
  ) {}

  async schedule(dto: ScheduleMessageDto, createdById: string): Promise<ScheduledMessage> {
    const scheduledAt = new Date(dto.scheduledAt);
    const record = await this.repo.save(
      this.repo.create({
        conversationId: dto.conversationId,
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
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Mensagem agendada não encontrada');
    if (record.status !== 'pending') return;
    if (record.bullJobId) {
      const job = await this.queue.getJob(record.bullJobId);
      if (job) await job.remove();
    }
    await this.repo.update(id, { status: 'cancelled' });
  }

  findAll(): Promise<ScheduledMessage[]> {
    return this.repo.find({ order: { scheduledAt: 'ASC' } });
  }

  findByConversation(conversationId: string): Promise<ScheduledMessage[]> {
    return this.repo.find({ where: { conversationId }, order: { scheduledAt: 'ASC' } });
  }

  async findOne(id: string): Promise<ScheduledMessage> {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Mensagem agendada não encontrada');
    return r;
  }
}
