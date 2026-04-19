import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

export interface InboxItem {
  id: string;
  leadId: string;
  channelType: string;
  externalId: string | null;
  contactId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactCategoria: string | null;
  lastMessageBody: string | null;
  lastMessageDirection: string | null;
  lastMessageSentAt: Date | null;
  unread: boolean;
  updatedAt: Date;
  pendingClassification: boolean;
}

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation) private repo: Repository<Conversation>,
    private readonly tenant: TenantContext,
  ) {}

  async findOrCreate(leadId: string, channelType: string, externalId?: string): Promise<Conversation> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const existing = await this.repo.findOne({ where: { leadId, channelType, workspaceId } });
    if (existing) return existing;
    const conv = this.repo.create({ leadId, channelType, externalId, workspaceId });
    return this.repo.save(conv);
  }

  create(dto: CreateConversationDto): Promise<Conversation> {
    return this.findOrCreate(dto.leadId, dto.channelType, dto.externalId);
  }

  findByLead(leadId: string): Promise<Conversation[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({ where: { leadId, workspaceId }, order: { createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<Conversation> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const c = await this.repo.findOne({ where: { id, workspaceId } });
    if (!c) throw new NotFoundException('Conversa não encontrada');
    return c;
  }

  async findInbox(): Promise<InboxItem[]> {
    const workspaceId = this.tenant.requireWorkspaceId();

    const rows: any[] = await this.repo.query(`
      SELECT
        c.id,
        c."leadId",
        c."channelType",
        c."externalId",
        c."updatedAt",
        contact.id                                                  AS "contactId",
        COALESCE(contact.name, l."externalName")                    AS "contactName",
        COALESCE(contact.whatsapp, contact.celular, contact.phone, l."externalPhone") AS "contactPhone",
        contact.categoria                                           AS "contactCategoria",
        lm.body                                                     AS "lastMessageBody",
        lm.direction                                                AS "lastMessageDirection",
        lm."sentAt"                                                 AS "lastMessageSentAt"
      FROM conversations c
      LEFT JOIN leads l        ON l.id = c."leadId"
      LEFT JOIN contacts contact ON contact.id = l."contactId"
      LEFT JOIN LATERAL (
        SELECT body, direction, "sentAt"
        FROM messages
        WHERE "conversationId" = c.id
        ORDER BY "sentAt" DESC
        LIMIT 1
      ) lm ON true
      WHERE c."workspaceId" = $1
      ORDER BY COALESCE(lm."sentAt", c."updatedAt") DESC
    `, [workspaceId]);

    return rows.map(r => ({
      id: r.id,
      leadId: r.leadId,
      channelType: r.channelType,
      externalId: r.externalId,
      contactId: r.contactId,
      contactName: r.contactName,
      contactPhone: r.contactPhone,
      contactCategoria: r.contactCategoria,
      lastMessageBody: r.lastMessageBody,
      lastMessageDirection: r.lastMessageDirection,
      lastMessageSentAt: r.lastMessageSentAt,
      unread: r.lastMessageDirection === 'inbound',
      updatedAt: r.updatedAt,
      pendingClassification: !r.contactId,
    }));
  }
}
