import { describe, it, expect } from 'vitest';
import { scoreTier, scoreVisual } from './score';

describe('scoreTier', () => {
  it.each([
    [null, null],
    [undefined, null],
    [NaN, null],
    [0, 'cold'],
    [39, 'cold'],
    [40, 'warm'],
    [59, 'warm'],
    [60, 'hot'],
    [79, 'hot'],
    [80, 'fire'],
    [100, 'fire'],
  ])('score=%s → tier=%s', (score, expected) => {
    expect(scoreTier(score as any)).toBe(expected);
  });
});

describe('scoreVisual', () => {
  it('returns null for null/undefined', () => {
    expect(scoreVisual(null)).toBeNull();
    expect(scoreVisual(undefined)).toBeNull();
  });

  it('returns visual config with tier and labels', () => {
    expect(scoreVisual(85)?.tier).toBe('fire');
    expect(scoreVisual(85)?.label).toBe('Quente');
    expect(scoreVisual(50)?.tier).toBe('warm');
    expect(scoreVisual(20)?.tier).toBe('cold');
  });

  it('produces colors for all tiers', () => {
    [10, 50, 70, 90].forEach((s) => {
      const v = scoreVisual(s);
      expect(v).not.toBeNull();
      expect(v!.bg).toMatch(/^rgba/);
      expect(v!.fg).toMatch(/^#/);
      expect(v!.border).toMatch(/^rgba/);
    });
  });
});
