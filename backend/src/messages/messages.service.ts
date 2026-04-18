import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageStatus } from './entities/message.entity';

export interface SaveInboundData {
  conversationId: string;
  externalMessageId: string;
  body: string;
  sentAt: Date;
}

export interface SaveOutboundData {
  conversationId: string;
  body: string;
  externalMessageId?: string;
  status: MessageStatus;
}

@Injectable()
export class MessagesService {
  constructor(@InjectRepository(Message) private repo: Repository<Message>) {}

  async saveInbound(data: SaveInboundData): Promise<Message | null> {
    const result = await this.repo
      .createQueryBuilder()
      .insert()
      .into(Message)
      .values({
        conversationId: data.conversationId,
        externalMessageId: data.externalMessageId,
        body: data.body,
        sentAt: data.sentAt,
        direction: 'inbound',
        status: 'delivered',
        type: 'text',
      })
      .orIgnore()
      .returning('*')
      .execute();
    const row = result.raw?.[0];
    return row ? (row as Message) : null;
  }

  saveOutbound(data: SaveOutboundData): Promise<Message> {
    const msg = this.repo.create({
      conversationId: data.conversationId,
      body: data.body,
      externalMessageId: data.externalMessageId,
      status: data.status,
      direction: 'outbound',
      type: 'text',
      sentAt: new Date(),
    });
    return this.repo.save(msg);
  }

  async updateStatus(externalMessageId: string, status: MessageStatus): Promise<void> {
    await this.repo.update({ externalMessageId }, { status });
  }

  findByConversation(conversationId: string, limit = 50): Promise<Message[]> {
    return this.repo.find({
      where: { conversationId },
      order: { sentAt: 'DESC' },
      take: limit,
    });
  }
}
