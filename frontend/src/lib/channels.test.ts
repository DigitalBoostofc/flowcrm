import { describe, it, expect } from 'vitest';
import { channelMeta, uniqueChannelTypes } from './channels';

describe('channelMeta', () => {
  it.each([
    ['evolution', 'WhatsApp (Evolution)'],
    ['uazapi', 'WhatsApp (uazapGO)'],
    ['meta', 'Meta / Facebook'],
    ['telegram', 'Telegram'],
  ])('returns label for %s', (type, expected) => {
    expect(channelMeta(type).label).toBe(expected);
  });

  it('handles uppercase', () => {
    expect(channelMeta('EVOLUTION').label).toBe('WhatsApp (Evolution)');
  });

  it('returns fallback for unknown type', () => {
    const meta = channelMeta('signal');
    expect(meta.label).toBe('Outro');
    expect(meta.type).toBe('signal');
  });

  it('returns fallback for null/undefined/empty', () => {
    expect(channelMeta(null).label).toBe('Outro');
    expect(channelMeta(undefined).label).toBe('Outro');
    expect(channelMeta('').label).toBe('Outro');
    expect(channelMeta('').type).toBe('unknown');
  });

  it('all known types have non-empty visual props', () => {
    (['evolution', 'uazapi', 'meta', 'telegram'] as const).forEach((t) => {
      const m = channelMeta(t);
      expect(m.shortLabel).toBeTruthy();
      expect(m.fg).toMatch(/^#/);
      expect(m.bg).toMatch(/^rgba/);
      expect(m.border).toMatch(/^rgba/);
    });
  });
});

describe('uniqueChannelTypes', () => {
  it('returns sorted unique lowercase types', () => {
    const items = [
      { channelType: 'evolution' },
      { channelType: 'EVOLUTION' },
      { channelType: 'meta' },
      { channelType: 'uazapi' },
      { channelType: 'meta' },
    ];
    expect(uniqueChannelTypes(items)).toEqual(['evolution', 'meta', 'uazapi']);
  });

  it('handles empty array', () => {
    expect(uniqueChannelTypes([])).toEqual([]);
  });

  it('skips falsy channelType values', () => {
    const items = [{ channelType: '' }, { channelType: 'evolution' }];
    expect(uniqueChannelTypes(items)).toEqual(['evolution']);
  });
});
