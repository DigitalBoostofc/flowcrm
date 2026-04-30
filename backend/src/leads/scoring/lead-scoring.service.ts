import { Injectable } from '@nestjs/common';
import { Lead, LeadStatus } from '../entities/lead.entity';

export interface ScoringFactors {
  base: number;
  value: number;
  ranking: number;
  freshness: number;
  status: number;
}

export interface ScoringResult {
  score: number;
  factors: ScoringFactors;
}

type ScoringInput = Pick<Lead, 'value' | 'ranking' | 'stageEnteredAt' | 'status'>;

@Injectable()
export class LeadScoringService {
  static readonly MIN = 0;
  static readonly MAX = 100;
  private static readonly BASE = 50;

  calculate(lead: ScoringInput, now: Date = new Date()): ScoringResult {
    const factors: ScoringFactors = {
      base: LeadScoringService.BASE,
      value: this.valueContribution(lead.value),
      ranking: this.rankingContribution(lead.ranking),
      freshness: this.freshnessContribution(lead.stageEnteredAt, now),
      status: this.statusContribution(lead.status),
    };
    const raw = factors.base + factors.value + factors.ranking + factors.freshness + factors.status;
    const score = Math.max(LeadScoringService.MIN, Math.min(LeadScoringService.MAX, Math.round(raw)));
    return { score, factors };
  }

  private valueContribution(value: number | null | undefined): number {
    const v = Number(value ?? 0);
    if (!Number.isFinite(v) || v <= 0) return 0;
    if (v < 1000) return 5;
    if (v < 5000) return 15;
    if (v < 20000) return 25;
    return 30;
  }

  private rankingContribution(ranking: number | null | undefined): number {
    if (ranking == null) return 0;
    const r = Math.max(0, Math.min(5, Math.round(Number(ranking))));
    return r * 3;
  }

  private freshnessContribution(stageEnteredAt: Date | null | undefined, now: Date): number {
    if (!stageEnteredAt) return 0;
    const enteredAt = stageEnteredAt instanceof Date ? stageEnteredAt : new Date(stageEnteredAt);
    if (Number.isNaN(enteredAt.getTime())) return 0;
    const days = (now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days < 0) return 0;
    if (days < 3) return 20;
    if (days < 7) return 10;
    if (days < 14) return 0;
    if (days < 30) return -10;
    return -20;
  }

  private statusContribution(status: LeadStatus | null | undefined): number {
    switch (status) {
      case LeadStatus.WON:
        return 20;
      case LeadStatus.LOST:
        return -50;
      case LeadStatus.FROZEN:
        return -10;
      case LeadStatus.ACTIVE:
      default:
        return 0;
    }
  }
}
