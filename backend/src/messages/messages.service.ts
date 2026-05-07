import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageStatus, MessageType } from './entities/message.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

export interface SaveInboundData {
  conversationId: string;
  externalMessageId: string;
  body: string;
  sentAt: Date;
  type?: MessageType;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaCaption?: string;
  mediaFileName?: string;
}

export interface SaveOutboundData {
  conversationId: string;
  body: string;
  externalMessageId?: string;
  status: MessageStatus;
  type?: MessageType;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaCaption?: string;
  mediaFileName?: string;
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private repo: Repository<Message>,
    private readonly tenant: TenantContext,
  ) {}

  async saveWebhookOutbound(data: SaveInboundData): Promise<Message | null> {
    const workspaceId = this.tenant.requireWorkspaceId();

    // Before inserting, try to claim an existing outbound row that was optimistically saved
    // by the controller with a fallback externalMessageId (null or 'uza-*'). This prevents
    // duplicates when the send-API response and the webhook use different field names for the ID.
    const windowStart = new Date(data.sentAt.getTime() - 30_000);
    const windowEnd = new Date(data.sentAt.getTime() + 30_000);

    const claimed = await this.repo
      .createQueryBuilder()
      .update(Message)
      .set({ externalMessageId: data.externalMessageId, status: 'sent' })
      .where('"conversationId" = :convId', { convId: data.conversationId })
      .andWhere('"workspaceId" = :wsId', { wsId: workspaceId })
      .andWhere('direction = :dir', { dir: 'outbound' })
      .andWhere('body = :body', { body: data.body })
      .andWhere('"sentAt" BETWEEN :start AND :end', { start: windowStart, end: windowEnd })
      .andWhere('("externalMessageId" IS NULL OR "externalMessageId" LIKE :fallback)', { fallback: 'uza-%' })
      .returning('*')
      .execute();

    if ((claimed.affected ?? 0) > 0) {
      return (claimed.raw?.[0] as Message) ?? null;
    }

    // No placeholder row found — do a regular deduped insert (handles genuine fromPhone sends
    // and the case where the send-API already returned the correct ID).
    const result = await this.repo
      .createQueryBuilder()
      .insert()
      .into(Message)
      .values({
        conversationId: data.conversationId,
        workspaceId,
        externalMessageId: data.externalMessageId,
        body: data.body,
        sentAt: data.sentAt,
        direction: 'outbound',
        status: 'sent',
        type: data.type ?? 'text',
        mediaUrl: data.mediaUrl ?? null,
        mediaMimeType: data.mediaMimeType ?? null,
        mediaCaption: data.mediaCaption ?? null,
        mediaFileName: data.mediaFileName ?? null,
      })
      .orIgnore()
      .returning('*')
      .execute();

    const row = result.raw?.[0];
    return row ? (row as Message) : null;
  }

  async saveInbound(data: SaveInboundData): Promise<Message | null> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const result = await this.repo
      .createQueryBuilder()
      .insert()
      .into(Message)
      .values({
        conversationId: data.conversationId,
        workspaceId,
        externalMessageId: data.externalMessageId,
        body: data.body,
        sentAt: data.sentAt,
        direction: 'inbound',
        status: 'delivered',
        type: data.type ?? 'text',
        mediaUrl: data.mediaUrl ?? null,
        mediaMimeType: data.mediaMimeType ?? null,
        mediaCaption: data.mediaCaption ?? null,
        mediaFileName: data.mediaFileName ?? null,
      })
      .orIgnore()
      .returning('*')
      .execute();
    const row = result.raw?.[0];
    return row ? (row as Message) : null;
  }

  saveOutbound(data: SaveOutboundData): Promise<Message> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const msg = this.repo.create({
      conversationId: data.conversationId,
      workspaceId,
      body: data.body,
      externalMessageId: data.externalMessageId,
      status: data.status,
      direction: 'outbound',
      type: data.type ?? 'text',
      sentAt: new Date(),
      mediaUrl: data.mediaUrl ?? null,
      mediaMimeType: data.mediaMimeType ?? null,
      mediaCaption: data.mediaCaption ?? null,
      mediaFileName: data.mediaFileName ?? null,
    });
    return this.repo.save(msg);
  }

  async updateStatus(externalMessageId: string, status: MessageStatus): Promise<void> {
    await this.repo.update({ externalMessageId }, { status });
  }

  async softDelete(messageId: string): Promise<void> {
    await this.repo.update(messageId, { deletedAt: new Date(), body: 'Mensagem apagada', type: 'deleted' });
  }

  findByConversation(conversationId: string, limit = 50): Promise<Message[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({
      where: { conversationId, workspaceId },
      order: { sentAt: 'DESC' },
      take: limit,
    });
  }
}
