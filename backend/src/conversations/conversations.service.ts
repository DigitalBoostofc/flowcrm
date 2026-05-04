import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { PipelinesService } from '../pipelines/pipelines.service';

export interface InboxItem {
  id: string;
  leadId: string | null;
  channelType: string;
  externalId: string | null;
  contactId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactCategoria: string | null;
  contactAvatarUrl: string | null;
  lastMessageBody: string | null;
  lastMessageDirection: string | null;
  lastMessageSentAt: Date | null;
  unread: boolean;
  updatedAt: Date;
  pendingClassification: boolean;
}

export interface InboxPage {
  items: InboxItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InboxQuery {
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation) private repo: Repository<Conversation>,
    private readonly tenant: TenantContext,
    private readonly contacts: ContactsService,
    private readonly leads: LeadsService,
    private readonly pipelines: PipelinesService,
  ) {}

  async findOrCreate(leadId: string, channelType: string, externalId?: string): Promise<Conversation> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const where = externalId
      ? { leadId, channelType, externalId, workspaceId }
      : { leadId, channelType, workspaceId };
    const existing = await this.repo.findOne({ where });
    if (existing) return existing;
    const conv = this.repo.create({ leadId, channelType, externalId, workspaceId });
    return this.repo.save(conv);
  }

  async findOrCreateUnqualified(channelType: string, externalId: string, workspaceId: string): Promise<Conversation> {
    // Look up by externalId regardless of leadId — so if the contact was already
    // qualified (leadId set), new inbound messages still land on the same conversation.
    const existing = await this.repo.findOne({ where: { channelType, externalId, workspaceId } });
    if (existing) return existing;
    const conv = this.repo.create({ channelType, externalId, workspaceId, leadId: null });
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

  async qualify(id: string, dto: { name: string }): Promise<{ leadId: string }> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const conv = await this.repo.findOne({ where: { id, workspaceId } });
    if (!conv) throw new NotFoundException('Conversa não encontrada');
    if (conv.leadId) return { leadId: conv.leadId };

    const contactName = dto.name?.trim() || conv.externalId || 'Desconhecido';
    const contact = await this.contacts.create({
      name: contactName,
      phone: conv.externalId ?? undefined,
      whatsapp: conv.externalId ?? undefined,
    } as any);

    const pipeline = await this.pipelines.findDefault();
    if (!pipeline || !pipeline.stages?.length) {
      throw new BadRequestException('Nenhum funil padrão com etapas configurado');
    }
    const firstStage = [...pipeline.stages].sort((a, b) => a.position - b.position)[0];

    const lead = await this.leads.create({
      contactId: contact.id,
      pipelineId: pipeline.id,
      stageId: firstStage.id,
    } as any);

    await this.repo.update({ id, workspaceId }, { leadId: lead.id });
    return { leadId: lead.id };
  }

  async findInbox(query: InboxQuery = {}): Promise<InboxPage> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 50));
    const offset = (page - 1) * pageSize;

    const totalRows: any[] = await this.repo.query(
      `SELECT COUNT(*)::int AS total FROM conversations WHERE "workspaceId" = $1`,
      [workspaceId],
    );
    const total: number = totalRows[0]?.total ?? 0;

    const rows: any[] = await this.repo.query(`
      SELECT
        c.id,
        c."leadId",
        c."channelType",
        c."externalId",
        c."updatedAt",
        c."lastReadAt",
        contact.id                                                  AS "contactId",
        COALESCE(contact.name, l."externalName")                    AS "contactName",
        COALESCE(contact.whatsapp, contact.celular, contact.phone, l."externalPhone", c."externalId") AS "contactPhone",
        contact.categoria                                           AS "contactCategoria",
        contact."avatarUrl"                                         AS "contactAvatarUrl",
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
      ORDER BY COALESCE(lm."sentAt", c."updatedAt") DESC, c.id DESC
      LIMIT $2 OFFSET $3
    `, [workspaceId, pageSize, offset]);

    const items: InboxItem[] = rows.map(r => ({
      id: r.id,
      leadId: r.leadId ?? null,
      channelType: r.channelType,
      externalId: r.externalId,
      contactId: r.contactId,
      contactName: r.contactName ?? null,
      contactPhone: r.contactPhone ?? null,
      contactCategoria: r.contactCategoria,
      contactAvatarUrl: r.contactAvatarUrl,
      lastMessageBody: r.lastMessageBody,
      lastMessageDirection: r.lastMessageDirection,
      lastMessageSentAt: r.lastMessageSentAt,
      unread: ConversationsService.computeUnread(r.lastMessageDirection, r.lastMessageSentAt, r.lastReadAt),
      updatedAt: r.updatedAt,
      pendingClassification: !r.leadId,
    }));

    return { items, total, page, pageSize };
  }

  static computeUnread(
    direction: string | null,
    lastMessageSentAt: Date | string | null,
    lastReadAt: Date | string | null,
  ): boolean {
    if (direction !== 'inbound') return false;
    if (!lastMessageSentAt) return false;
    if (!lastReadAt) return true;
    const msgTime = lastMessageSentAt instanceof Date ? lastMessageSentAt.getTime() : new Date(lastMessageSentAt).getTime();
    const readTime = lastReadAt instanceof Date ? lastReadAt.getTime() : new Date(lastReadAt).getTime();
    return msgTime > readTime;
  }

  async markAsRead(id: string): Promise<{ id: string; lastReadAt: Date }> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const now = new Date();
    const result = await this.repo.update({ id, workspaceId }, { lastReadAt: now });
    if (!result.affected) throw new NotFoundException('Conversa não encontrada');
    return { id, lastReadAt: now };
  }
}
