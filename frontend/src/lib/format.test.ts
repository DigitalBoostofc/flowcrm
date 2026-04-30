import { describe, it, expect } from 'vitest';
import { formatBRL } from './format';

describe('formatBRL', () => {
  it('formats positive amount in BRL with comma decimals', () => {
    // Intl.NumberFormat may use NBSP between R$ and the digits — normalize spaces for assertion.
    const out = formatBRL(1234.56).replace(/\s+/g, ' ');
    expect(out).toBe('R$ 1.234,56');
  });

  it('returns R$ 0,00 for null', () => {
    expect(formatBRL(null).replace(/\s+/g, ' ')).toBe('R$ 0,00');
  });

  it('returns R$ 0,00 for undefined', () => {
    expect(formatBRL(undefined).replace(/\s+/g, ' ')).toBe('R$ 0,00');
  });

  it('formats zero explicitly', () => {
    expect(formatBRL(0).replace(/\s+/g, ' ')).toBe('R$ 0,00');
  });

  it('handles negative values', () => {
    const out = formatBRL(-99.5).replace(/\s+/g, ' ');
    expect(out).toContain('99,50');
    expect(out).toMatch(/-/); // negative sign somewhere
  });
});
