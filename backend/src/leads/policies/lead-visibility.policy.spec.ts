import { Brackets } from 'typeorm';
import { LeadVisibilityPolicy, LeadVisibilityContext } from './lead-visibility.policy';
import { LeadPrivacy } from '../entities/lead.entity';
import { UserRole } from '../../users/entities/user.entity';

describe('LeadVisibilityPolicy', () => {
  const ws1 = 'ws-1';
  const ws2 = 'ws-2';
  const userA = 'user-A';
  const userB = 'user-B';

  const baseLead = {
    workspaceId: ws1,
    privacy: LeadPrivacy.ALL,
    createdById: userB,
    assignedToId: null as any,
    additionalAccessUserIds: [] as string[],
  };

  describe('isPrivileged', () => {
    it.each([
      [UserRole.OWNER, true],
      [UserRole.MANAGER, true],
      [UserRole.SELLER, false],
      [UserRole.AGENT, false],
      [undefined, false],
      ['unknown-role' as any, false],
    ])('role %s → %s', (role, expected) => {
      expect(LeadVisibilityPolicy.isPrivileged(role as any)).toBe(expected);
    });
  });

  describe('canRead — cross-workspace isolation (LGPD)', () => {
    it('denies OWNER from accessing lead in another workspace', () => {
      const lead = { ...baseLead, workspaceId: ws2 };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.OWNER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(false);
    });

    it('denies MANAGER cross-workspace', () => {
      const lead = { ...baseLead, workspaceId: ws2 };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.MANAGER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(false);
    });

    it('denies SELLER cross-workspace even when they created the lead', () => {
      const lead = { ...baseLead, workspaceId: ws2, createdById: userA };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.SELLER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(false);
    });

    it('denies AGENT cross-workspace even when assigned', () => {
      const lead = { ...baseLead, workspaceId: ws2, assignedToId: userA, privacy: LeadPrivacy.ALL };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.AGENT, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(false);
    });
  });

  describe('canRead — privileged roles within workspace', () => {
    it('OWNER sees restricted lead they have no link to', () => {
      const lead = { ...baseLead, privacy: LeadPrivacy.RESTRICTED, createdById: userB, assignedToId: userB };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.OWNER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(true);
    });

    it('MANAGER sees restricted lead they have no link to', () => {
      const lead = { ...baseLead, privacy: LeadPrivacy.RESTRICTED };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.MANAGER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(true);
    });

    it('OWNER passes even without userId in context (privileged short-circuit)', () => {
      const lead = { ...baseLead };
      const ctx: LeadVisibilityContext = { userId: undefined, role: UserRole.OWNER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(true);
    });
  });

  describe('canRead — non-privileged + privacy=all', () => {
    it('SELLER sees lead with privacy=all without any link', () => {
      const lead = { ...baseLead, privacy: LeadPrivacy.ALL, createdById: userB };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.SELLER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(true);
    });

    it('AGENT sees lead with privacy=all without any link', () => {
      const lead = { ...baseLead, privacy: LeadPrivacy.ALL };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.AGENT, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(true);
    });
  });

  describe('canRead — non-privileged + privacy=restricted', () => {
    it('denies SELLER without any link', () => {
      const lead = { ...baseLead, privacy: LeadPrivacy.RESTRICTED, createdById: userB };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.SELLER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(false);
    });

    it('allows when user is the creator', () => {
      const lead = { ...baseLead, privacy: LeadPrivacy.RESTRICTED, createdById: userA };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.SELLER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(true);
    });

    it('allows when user is the assignee', () => {
      const lead = { ...baseLead, privacy: LeadPrivacy.RESTRICTED, createdById: userB, assignedToId: userA };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.SELLER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(true);
    });

    it('allows when user is in additionalAccessUserIds', () => {
      const lead = { ...baseLead, privacy: LeadPrivacy.RESTRICTED, createdById: userB, additionalAccessUserIds: [userA] };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.SELLER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(true);
    });

    it('denies when additionalAccessUserIds excludes the user', () => {
      const lead = { ...baseLead, privacy: LeadPrivacy.RESTRICTED, createdById: userB, additionalAccessUserIds: [userB, 'other'] };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.SELLER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(false);
    });

    it('handles null assignedToId without crashing', () => {
      const lead = { ...baseLead, privacy: LeadPrivacy.RESTRICTED, createdById: userB, assignedToId: null as any };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.SELLER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(false);
    });

    it('handles null additionalAccessUserIds defensively', () => {
      const lead = { ...baseLead, privacy: LeadPrivacy.RESTRICTED, createdById: userB, additionalAccessUserIds: null as any };
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.SELLER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(false);
    });
  });

  describe('canRead — non-privileged without userId (defense-in-depth)', () => {
    it('denies SELLER without userId even on privacy=all', () => {
      const lead = { ...baseLead, privacy: LeadPrivacy.ALL };
      const ctx: LeadVisibilityContext = { userId: undefined, role: UserRole.SELLER, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(false);
    });

    it('denies AGENT without userId', () => {
      const lead = { ...baseLead };
      const ctx: LeadVisibilityContext = { userId: undefined, role: UserRole.AGENT, workspaceId: ws1 };
      expect(LeadVisibilityPolicy.canRead(lead, ctx)).toBe(false);
    });
  });

  describe('applyToQueryBuilder', () => {
    function makeQbMock() {
      const calls: any[] = [];
      const qb: any = {
        andWhere: jest.fn().mockImplementation((arg: any, params?: any) => {
          calls.push({ arg, params });
          return qb;
        }),
      };
      return { qb, calls };
    }

    function makeInnerMock() {
      const inner: any = {};
      inner.where = jest.fn(() => inner);
      inner.orWhere = jest.fn(() => inner);
      return inner;
    }

    it('does not add restriction for OWNER', () => {
      const { qb, calls } = makeQbMock();
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.OWNER, workspaceId: ws1 };
      const result = LeadVisibilityPolicy.applyToQueryBuilder(qb, 'lead', ctx);
      expect(calls).toHaveLength(0);
      expect(result).toBe(qb);
    });

    it('does not add restriction for MANAGER', () => {
      const { qb, calls } = makeQbMock();
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.MANAGER, workspaceId: ws1 };
      LeadVisibilityPolicy.applyToQueryBuilder(qb, 'lead', ctx);
      expect(calls).toHaveLength(0);
    });

    it('adds Brackets with 4 OR conditions for SELLER with userId', () => {
      const { qb, calls } = makeQbMock();
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.SELLER, workspaceId: ws1 };
      LeadVisibilityPolicy.applyToQueryBuilder(qb, 'lead', ctx);
      expect(calls).toHaveLength(1);
      expect(calls[0].arg).toBeInstanceOf(Brackets);

      const inner = makeInnerMock();
      (calls[0].arg as Brackets).whereFactory(inner);
      expect(inner.where).toHaveBeenCalledTimes(1);
      expect(inner.orWhere).toHaveBeenCalledTimes(3);
      const whereSql = inner.where.mock.calls[0][0] as string;
      expect(whereSql).toContain('lead.privacy');
      const orSqls: string[] = inner.orWhere.mock.calls.map((c: any[]) => String(c[0]));
      expect(orSqls.some((s: string) => s.includes('lead.createdById'))).toBe(true);
      expect(orSqls.some((s: string) => s.includes('lead.assignedToId'))).toBe(true);
      expect(orSqls.some((s: string) => s.includes('lead.additionalAccessUserIds'))).toBe(true);
    });

    it('honors custom alias in column references', () => {
      const { qb, calls } = makeQbMock();
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.SELLER, workspaceId: ws1 };
      LeadVisibilityPolicy.applyToQueryBuilder(qb, 'l', ctx);
      const inner = makeInnerMock();
      (calls[0].arg as Brackets).whereFactory(inner);
      expect(inner.where.mock.calls[0][0]).toContain('l.privacy');
      const orSqls: string[] = inner.orWhere.mock.calls.map((c: any[]) => String(c[0]));
      expect(orSqls.every((s: string) => s.startsWith('l.'))).toBe(true);
    });

    it('passes additionalAccessUserIds as JSON-stringified single-element array of userId', () => {
      const { qb, calls } = makeQbMock();
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.SELLER, workspaceId: ws1 };
      LeadVisibilityPolicy.applyToQueryBuilder(qb, 'lead', ctx);
      const inner = makeInnerMock();
      (calls[0].arg as Brackets).whereFactory(inner);
      const jsonCall = inner.orWhere.mock.calls.find((c: any[]) =>
        String(c[0]).includes('additionalAccessUserIds'),
      );
      expect(jsonCall).toBeDefined();
      const params = jsonCall![1] as Record<string, unknown>;
      const jsonValue = Object.values(params).find((v) => typeof v === 'string' && v.startsWith('[')) as string;
      expect(JSON.parse(jsonValue)).toEqual([userA]);
    });

    it('denies all leads when SELLER has no userId (defensive 1=0)', () => {
      const { qb, calls } = makeQbMock();
      const ctx: LeadVisibilityContext = { userId: undefined, role: UserRole.SELLER, workspaceId: ws1 };
      LeadVisibilityPolicy.applyToQueryBuilder(qb, 'lead', ctx);
      expect(calls).toHaveLength(1);
      expect(calls[0].arg).toBe('1 = 0');
    });

    it('uses parameter names that do not clash with common names (privacy, uid)', () => {
      const { qb, calls } = makeQbMock();
      const ctx: LeadVisibilityContext = { userId: userA, role: UserRole.SELLER, workspaceId: ws1 };
      LeadVisibilityPolicy.applyToQueryBuilder(qb, 'lead', ctx);
      const inner = makeInnerMock();
      (calls[0].arg as Brackets).whereFactory(inner);
      const allParams = [
        ...inner.where.mock.calls.map((c: any[]) => c[1] || {}),
        ...inner.orWhere.mock.calls.map((c: any[]) => c[1] || {}),
      ];
      const allKeys = allParams.flatMap((p: object) => Object.keys(p));
      expect(allKeys.every((k) => k.startsWith('lvp_') || k.startsWith('__lvp'))).toBe(true);
    });
  });
});
