export type ScoreTier = 'cold' | 'warm' | 'hot' | 'fire';

export interface ScoreVisual {
  tier: ScoreTier;
  label: string;
  bg: string;
  fg: string;
  border: string;
}

export function scoreTier(score: number | null | undefined): ScoreTier | null {
  if (score == null || !Number.isFinite(score)) return null;
  if (score >= 80) return 'fire';
  if (score >= 60) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

export function scoreVisual(score: number | null | undefined): ScoreVisual | null {
  const tier = scoreTier(score);
  if (!tier) return null;
  switch (tier) {
    case 'fire':
      return { tier, label: 'Quente', bg: 'rgba(239,68,68,0.12)', fg: '#dc2626', border: 'rgba(239,68,68,0.30)' };
    case 'hot':
      return { tier, label: 'Promissor', bg: 'rgba(245,158,11,0.12)', fg: '#d97706', border: 'rgba(245,158,11,0.30)' };
    case 'warm':
      return { tier, label: 'Morno', bg: 'rgba(234,179,8,0.10)', fg: '#a16207', border: 'rgba(234,179,8,0.28)' };
    case 'cold':
      return { tier, label: 'Frio', bg: 'rgba(100,116,139,0.10)', fg: '#475569', border: 'rgba(100,116,139,0.25)' };
  }
}
