import { LeadScoringService } from './lead-scoring.service';
import { LeadStatus } from '../entities/lead.entity';

describe('LeadScoringService', () => {
  let service: LeadScoringService;
  const now = new Date('2026-04-30T12:00:00Z');

  function daysAgo(d: number): Date {
    return new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
  }

  beforeEach(() => {
    service = new LeadScoringService();
  });

  describe('clamping', () => {
    it('never returns below 0', () => {
      const result = service.calculate(
        { value: 0, ranking: 0, stageEnteredAt: daysAgo(60), status: LeadStatus.LOST },
        now,
      );
      expect(result.score).toBe(0);
    });

    it('never returns above 100', () => {
      const result = service.calculate(
        { value: 999999, ranking: 5, stageEnteredAt: daysAgo(0), status: LeadStatus.WON },
        now,
      );
      expect(result.score).toBe(100);
    });

    it('returns integer (rounded)', () => {
      const result = service.calculate(
        { value: 1500, ranking: 3, stageEnteredAt: daysAgo(2), status: LeadStatus.ACTIVE },
        now,
      );
      expect(Number.isInteger(result.score)).toBe(true);
    });
  });

  describe('value factor', () => {
    it.each([
      [0, 0],
      [-100, 0],
      [500, 5],
      [1000, 15],
      [4999, 15],
      [5000, 25],
      [19999, 25],
      [20000, 30],
      [100000, 30],
    ])('value=%s → +%s', (value, expected) => {
      const r = service.calculate(
        { value: value as any, ranking: null as any, stageEnteredAt: null as any, status: LeadStatus.ACTIVE },
        now,
      );
      expect(r.factors.value).toBe(expected);
    });

    it('handles null/undefined value as 0', () => {
      const r1 = service.calculate(
        { value: null as any, ranking: null as any, stageEnteredAt: null as any, status: LeadStatus.ACTIVE },
        now,
      );
      const r2 = service.calculate(
        { value: undefined as any, ranking: null as any, stageEnteredAt: null as any, status: LeadStatus.ACTIVE },
        now,
      );
      expect(r1.factors.value).toBe(0);
      expect(r2.factors.value).toBe(0);
    });

    it('handles NaN value as 0', () => {
      const r = service.calculate(
        { value: NaN as any, ranking: null as any, stageEnteredAt: null as any, status: LeadStatus.ACTIVE },
        now,
      );
      expect(r.factors.value).toBe(0);
    });
  });

  describe('ranking factor', () => {
    it.each([
      [null, 0],
      [0, 0],
      [1, 3],
      [3, 9],
      [5, 15],
      [10, 15],
      [-3, 0],
    ])('ranking=%s → +%s', (ranking, expected) => {
      const r = service.calculate(
        { value: 0, ranking: ranking as any, stageEnteredAt: null as any, status: LeadStatus.ACTIVE },
        now,
      );
      expect(r.factors.ranking).toBe(expected);
    });
  });

  describe('freshness factor', () => {
    it.each([
      [null, 0],
      [0, 20],
      [2, 20],
      [3, 10],
      [6, 10],
      [7, 0],
      [13, 0],
      [14, -10],
      [29, -10],
      [30, -20],
      [180, -20],
    ])('stageEnteredAt %s days ago → %s', (days, expected) => {
      const stageEnteredAt = days == null ? null : daysAgo(days as number);
      const r = service.calculate(
        { value: 0, ranking: null as any, stageEnteredAt: stageEnteredAt as any, status: LeadStatus.ACTIVE },
        now,
      );
      expect(r.factors.freshness).toBe(expected);
    });

    it('treats invalid date as 0', () => {
      const r = service.calculate(
        { value: 0, ranking: null as any, stageEnteredAt: new Date('invalid') as any, status: LeadStatus.ACTIVE },
        now,
      );
      expect(r.factors.freshness).toBe(0);
    });

    it('treats future stageEnteredAt as 0 (clock skew)', () => {
      const r = service.calculate(
        { value: 0, ranking: null as any, stageEnteredAt: new Date(now.getTime() + 86400000) as any, status: LeadStatus.ACTIVE },
        now,
      );
      expect(r.factors.freshness).toBe(0);
    });

    it('accepts ISO string for stageEnteredAt', () => {
      const r = service.calculate(
        { value: 0, ranking: null as any, stageEnteredAt: daysAgo(1).toISOString() as any, status: LeadStatus.ACTIVE },
        now,
      );
      expect(r.factors.freshness).toBe(20);
    });
  });

  describe('status factor', () => {
    it.each([
      [LeadStatus.ACTIVE, 0],
      [LeadStatus.WON, 20],
      [LeadStatus.LOST, -50],
      [LeadStatus.FROZEN, -10],
      [null, 0],
    ])('status=%s → %s', (status, expected) => {
      const r = service.calculate(
        { value: 0, ranking: null as any, stageEnteredAt: null as any, status: status as any },
        now,
      );
      expect(r.factors.status).toBe(expected);
    });
  });

  describe('composition', () => {
    it('lead novo de alto valor com bom ranking → próximo do topo', () => {
      const r = service.calculate(
        { value: 25000, ranking: 5, stageEnteredAt: daysAgo(1), status: LeadStatus.ACTIVE },
        now,
      );
      // base 50 + value 30 + ranking 15 + freshness 20 + status 0 = 115 → clamped to 100
      expect(r.score).toBe(100);
      expect(r.factors).toEqual({ base: 50, value: 30, ranking: 15, freshness: 20, status: 0 });
    });

    it('lead morno (médio em tudo) fica perto da base', () => {
      const r = service.calculate(
        { value: 1500, ranking: 2, stageEnteredAt: daysAgo(5), status: LeadStatus.ACTIVE },
        now,
      );
      // base 50 + value 15 + ranking 6 + freshness 10 + status 0 = 81
      expect(r.score).toBe(81);
    });

    it('lead perdido cai pra muito baixo independente do resto', () => {
      const r = service.calculate(
        { value: 50000, ranking: 5, stageEnteredAt: daysAgo(1), status: LeadStatus.LOST },
        now,
      );
      // base 50 + value 30 + ranking 15 + freshness 20 + status -50 = 65
      expect(r.score).toBe(65);
    });

    it('lead vencido + velho + sem valor afunda', () => {
      const r = service.calculate(
        { value: null as any, ranking: null as any, stageEnteredAt: daysAgo(60), status: LeadStatus.LOST },
        now,
      );
      // base 50 + 0 + 0 + (-20) + (-50) = -20 → clamped to 0
      expect(r.score).toBe(0);
    });

    it('exposes all factor breakdown', () => {
      const r = service.calculate(
        { value: 1000, ranking: 1, stageEnteredAt: daysAgo(1), status: LeadStatus.WON },
        now,
      );
      expect(r.factors).toEqual({ base: 50, value: 15, ranking: 3, freshness: 20, status: 20 });
    });
  });
});
