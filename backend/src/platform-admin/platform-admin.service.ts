import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Between, DataSource, IsNull, MoreThanOrEqual, Repository } from 'typeorm';
import { Workspace, SubscriptionStatus } from '../workspaces/entities/workspace.entity';
import { User } from '../users/entities/user.entity';
import { ChannelConfig } from '../channels/entities/channel-config.entity';
import { OtpVerification } from '../signup/entities/otp-verification.entity';
import { PlatformAuditLog } from './entities/platform-audit-log.entity';
import { PlatformBroadcast, BroadcastSeverity } from './entities/platform-broadcast.entity';
import { FeatureFlag } from './entities/feature-flag.entity';

export interface WorkspaceSummary {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  subscriptionStatus: SubscriptionStatus;
  planSlug: string | null;
  trialStartedAt: Date;
  trialEndsAt: Date;
  usersCount: number;
  leadsCount: number;
  messagesLast30d: number;
  createdAt: Date;
}

@Injectable()
export class PlatformAdminService {
  constructor(
    @InjectRepository(Workspace) private wsRepo: Repository<Workspace>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ChannelConfig) private chanRepo: Repository<ChannelConfig>,
    @InjectRepository(OtpVerification) private otpRepo: Repository<OtpVerification>,
    @InjectRepository(PlatformAuditLog) private auditRepo: Repository<PlatformAuditLog>,
    @InjectRepository(PlatformBroadcast) private broadcastRepo: Repository<PlatformBroadcast>,
    @InjectRepository(FeatureFlag) private flagRepo: Repository<FeatureFlag>,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
  ) {}

  // ── Workspaces ────────────────────────────────────────

  async listWorkspaces(search?: string): Promise<WorkspaceSummary[]> {
    const qb = this.wsRepo
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.owner', 'owner')
      .orderBy('w.createdAt', 'DESC');
    if (search) {
      qb.where('w.name ILIKE :q OR owner.email ILIKE :q OR owner.name ILIKE :q', { q: `%${search}%` });
    }
    const workspaces = await qb.getMany();
    if (workspaces.length === 0) return [];

    const ids = workspaces.map((w) => w.id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

    const users = await this.dataSource.query(
      `SELECT "workspaceId", COUNT(*)::int AS count FROM "users" WHERE "workspaceId" = ANY($1) GROUP BY "workspaceId"`,
      [ids],
    );
    const leads = await this.dataSource.query(
      `SELECT "workspaceId", COUNT(*)::int AS count FROM "leads" WHERE "workspaceId" = ANY($1) GROUP BY "workspaceId"`,
      [ids],
    );
    const msgs = await this.dataSource.query(
      `SELECT "workspaceId", COUNT(*)::int AS count FROM "messages" WHERE "workspaceId" = ANY($1) AND "createdAt" >= $2 GROUP BY "workspaceId"`,
      [ids, thirtyDaysAgo],
    );

    const mapCount = (rows: { workspaceId: string; count: number }[]) =>
      Object.fromEntries(rows.map((r) => [r.workspaceId, r.count]));
    const usersMap = mapCount(users);
    const leadsMap = mapCount(leads);
    const msgsMap = mapCount(msgs);

    return workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      ownerName: w.owner?.name ?? null,
      ownerEmail: w.owner?.email ?? null,
      subscriptionStatus: w.subscriptionStatus,
      planSlug: w.planSlug ?? null,
      trialStartedAt: w.trialStartedAt,
      trialEndsAt: w.trialEndsAt,
      usersCount: usersMap[w.id] ?? 0,
      leadsCount: leadsMap[w.id] ?? 0,
      messagesLast30d: msgsMap[w.id] ?? 0,
      createdAt: w.createdAt,
    }));
  }

  async getWorkspace(id: string) {
    const ws = await this.wsRepo.findOne({ where: { id }, relations: ['owner'] });
    if (!ws) throw new NotFoundException('Workspace não encontrado');
    const users = await this.userRepo.find({ where: { workspaceId: id }, order: { createdAt: 'DESC' } });
    const channels = await this.chanRepo.find({ where: { workspaceId: id }, order: { createdAt: 'DESC' } });
    return { workspace: ws, users, channels };
  }

  async updateWorkspace(
    id: string,
    patch: { subscriptionStatus?: SubscriptionStatus; trialEndsAt?: string | Date; name?: string; planSlug?: string | null },
    actor: { email: string; userId: string },
  ) {
    const ws = await this.wsRepo.findOne({ where: { id } });
    if (!ws) throw new NotFoundException('Workspace não encontrado');

    const before = {
      subscriptionStatus: ws.subscriptionStatus,
      trialEndsAt: ws.trialEndsAt,
      name: ws.name,
      planSlug: ws.planSlug,
    };

    if (patch.name !== undefined) ws.name = patch.name;
    if (patch.subscriptionStatus !== undefined) ws.subscriptionStatus = patch.subscriptionStatus;
    if (patch.trialEndsAt !== undefined) ws.trialEndsAt = new Date(patch.trialEndsAt);
    if (patch.planSlug !== undefined) ws.planSlug = patch.planSlug && patch.planSlug.length > 0 ? patch.planSlug : null;
    await this.wsRepo.save(ws);

    await this.logAction(actor, 'workspace.update', { targetWorkspaceId: id, metadata: { before, after: patch } });
    return ws;
  }

  async impersonate(workspaceId: string, actor: { email: string; userId: string }): Promise<{ accessToken: string; user: any }> {
    const ws = await this.wsRepo.findOne({ where: { id: workspaceId } });
    if (!ws) throw new NotFoundException('Workspace não encontrado');
    if (!ws.ownerUserId) throw new BadRequestException('Workspace sem dono definido');
    const owner = await this.userRepo.findOne({ where: { id: ws.ownerUserId } });
    if (!owner) throw new NotFoundException('Owner não encontrado');

    const token = this.jwt.sign(
      { sub: owner.id, email: owner.email, role: owner.role, workspaceId: owner.workspaceId, impersonatedBy: actor.email },
      { expiresIn: '2h' },
    );

    await this.logAction(actor, 'workspace.impersonate', {
      targetWorkspaceId: workspaceId,
      targetUserId: owner.id,
      metadata: { ownerEmail: owner.email },
    });

    return {
      accessToken: token,
      user: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: owner.role,
        workspaceId: owner.workspaceId,
      },
    };
  }

  // ── Channels (cross-workspace) ────────────────────────

  async listChannels(): Promise<Array<ChannelConfig & { workspaceName: string | null }>> {
    const rows = await this.dataSource.query<
      Array<{
        id: string;
        workspaceId: string;
        name: string;
        type: string;
        status: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        workspaceName: string | null;
      }>
    >(`
      SELECT c.id, c."workspaceId", c.name, c.type, c.status, c.active,
             c."createdAt", c."updatedAt", w.name AS "workspaceName"
      FROM "channel_configs" c
      LEFT JOIN "workspaces" w ON w.id = c."workspaceId"
      WHERE c.active = true
      ORDER BY c."createdAt" DESC
    `);
    return rows as any;
  }

  // ── Signups ───────────────────────────────────────────

  async listSignups(days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);
    const all = await this.otpRepo.find({
      where: { purpose: 'signup', createdAt: MoreThanOrEqual(since) as any },
      order: { createdAt: 'DESC' },
    });
    return all.map((o) => ({
      id: o.id,
      phone: o.phone,
      email: (o.payload as any)?.email ?? null,
      name: (o.payload as any)?.name ?? null,
      workspaceName: (o.payload as any)?.workspaceName ?? null,
      attempts: o.attempts,
      verified: !!o.consumedAt,
      expiresAt: o.expiresAt,
      consumedAt: o.consumedAt,
      createdAt: o.createdAt,
    }));
  }

  async signupFunnel(days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);
    const started = await this.otpRepo.count({
      where: { purpose: 'signup', createdAt: MoreThanOrEqual(since) as any },
    });
    const verified = await this.otpRepo
      .createQueryBuilder('o')
      .where('o.purpose = :p', { p: 'signup' })
      .andWhere('o."createdAt" >= :s', { s: since })
      .andWhere('o."consumedAt" IS NOT NULL')
      .getCount();
    const workspacesCreated = await this.wsRepo.count({
      where: { createdAt: MoreThanOrEqual(since) as any },
    });
    const convertedToPaid = await this.wsRepo.count({
      where: { createdAt: MoreThanOrEqual(since) as any, subscriptionStatus: 'active' },
    });
    return { started, verified, workspacesCreated, convertedToPaid };
  }

  // ── Metrics ───────────────────────────────────────────

  async metrics() {
    const totalWorkspaces = await this.wsRepo.count();
    const trial = await this.wsRepo.count({ where: { subscriptionStatus: 'trial' } });
    const active = await this.wsRepo.count({ where: { subscriptionStatus: 'active' } });
    const expired = await this.wsRepo.count({ where: { subscriptionStatus: 'expired' } });
    const canceled = await this.wsRepo.count({ where: { subscriptionStatus: 'canceled' } });
    const totalUsers = await this.userRepo.count();

    const now = new Date();
    const trialExpiringIn7d = await this.wsRepo.count({
      where: {
        subscriptionStatus: 'trial',
        trialEndsAt: Between(now, new Date(now.getTime() + 7 * 86_400_000)) as any,
      },
    });

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const [{ count: totalMsgs30d }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM "messages" WHERE "createdAt" >= $1`,
      [thirtyDaysAgo],
    );
    const [{ count: totalLeads }] = await this.dataSource.query(`SELECT COUNT(*)::int AS count FROM "leads"`);

    return {
      totalWorkspaces,
      byStatus: { trial, active, expired, canceled },
      trialExpiringIn7d,
      totalUsers,
      totalLeads,
      totalMessagesLast30d: totalMsgs30d,
    };
  }

  // ── Broadcasts ────────────────────────────────────────

  async listBroadcasts() {
    return this.broadcastRepo.find({ order: { createdAt: 'DESC' } });
  }

  async activeBroadcasts(): Promise<PlatformBroadcast[]> {
    const now = new Date();
    const all = await this.broadcastRepo.find({ where: { active: true }, order: { createdAt: 'DESC' } });
    return all.filter((b) => {
      if (b.startsAt && b.startsAt > now) return false;
      if (b.endsAt && b.endsAt < now) return false;
      return true;
    });
  }

  async createBroadcast(
    dto: { title: string; body: string; severity?: BroadcastSeverity; startsAt?: string; endsAt?: string; active?: boolean },
    actor: { email: string; userId: string },
  ) {
    const b = this.broadcastRepo.create({
      title: dto.title,
      body: dto.body,
      severity: dto.severity ?? 'info',
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      active: dto.active ?? true,
      createdByEmail: actor.email,
    });
    const saved = await this.broadcastRepo.save(b);
    await this.logAction(actor, 'broadcast.create', { metadata: { id: saved.id, title: saved.title } });
    return saved;
  }

  async updateBroadcast(
    id: string,
    dto: Partial<{ title: string; body: string; severity: BroadcastSeverity; startsAt: string | null; endsAt: string | null; active: boolean }>,
    actor: { email: string; userId: string },
  ) {
    const b = await this.broadcastRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Broadcast não encontrado');
    if (dto.title !== undefined) b.title = dto.title;
    if (dto.body !== undefined) b.body = dto.body;
    if (dto.severity !== undefined) b.severity = dto.severity;
    if (dto.startsAt !== undefined) b.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) b.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.active !== undefined) b.active = dto.active;
    const saved = await this.broadcastRepo.save(b);
    await this.logAction(actor, 'broadcast.update', { metadata: { id: saved.id } });
    return saved;
  }

  async deleteBroadcast(id: string, actor: { email: string; userId: string }) {
    const b = await this.broadcastRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Broadcast não encontrado');
    await this.broadcastRepo.delete(id);
    await this.logAction(actor, 'broadcast.delete', { metadata: { id, title: b.title } });
  }

  // ── Feature Flags ─────────────────────────────────────

  async listFlags() {
    return this.flagRepo.find({ order: { key: 'ASC', workspaceId: 'ASC' } });
  }

  async upsertFlag(
    dto: { key: string; workspaceId?: string | null; enabled: boolean; metadata?: Record<string, unknown> },
    actor: { email: string; userId: string },
  ) {
    const wsId = dto.workspaceId ?? null;
    const existing = await this.flagRepo.findOne({
      where: { key: dto.key, workspaceId: wsId === null ? (IsNull() as any) : wsId },
    });
    if (existing) {
      existing.enabled = dto.enabled;
      if (dto.metadata !== undefined) existing.metadata = dto.metadata;
      const saved = await this.flagRepo.save(existing);
      await this.logAction(actor, 'flag.update', {
        targetWorkspaceId: wsId,
        metadata: { key: dto.key, enabled: dto.enabled },
      });
      return saved;
    }
    const created = this.flagRepo.create({
      key: dto.key,
      workspaceId: wsId,
      enabled: dto.enabled,
      metadata: dto.metadata ?? {},
    });
    const saved = await this.flagRepo.save(created);
    await this.logAction(actor, 'flag.create', {
      targetWorkspaceId: wsId,
      metadata: { key: dto.key, enabled: dto.enabled },
    });
    return saved;
  }

  async deleteFlag(id: string, actor: { email: string; userId: string }) {
    const f = await this.flagRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Feature flag não encontrada');
    await this.flagRepo.delete(id);
    await this.logAction(actor, 'flag.delete', {
      targetWorkspaceId: f.workspaceId,
      metadata: { key: f.key },
    });
  }

  // ── Audit ─────────────────────────────────────────────

  async listAudit(limit = 100, offset = 0) {
    return this.auditRepo.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
      skip: offset,
    });
  }

  private async logAction(
    actor: { email: string; userId: string },
    action: string,
    extra: { targetWorkspaceId?: string | null; targetUserId?: string | null; metadata?: Record<string, unknown> } = {},
  ) {
    const log = this.auditRepo.create({
      actorEmail: actor.email,
      actorUserId: actor.userId,
      action,
      targetWorkspaceId: extra.targetWorkspaceId ?? null,
      targetUserId: extra.targetUserId ?? null,
      metadata: extra.metadata ?? {},
    });
    await this.auditRepo.save(log);
  }
}
