export type KnownChannelType = 'evolution' | 'uazapi' | 'meta' | 'telegram';

export interface ChannelMeta {
  type: string;
  label: string;
  shortLabel: string;
  fg: string;
  bg: string;
  border: string;
}

const REGISTRY: Record<KnownChannelType, Omit<ChannelMeta, 'type'>> = {
  evolution: {
    label: 'WhatsApp (Evolution)',
    shortLabel: 'WhatsApp',
    fg: '#059669',
    bg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.28)',
  },
  uazapi: {
    label: 'WhatsApp (uazapGO)',
    shortLabel: 'WhatsApp',
    fg: '#15803d',
    bg: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.28)',
  },
  meta: {
    label: 'Meta / Facebook',
    shortLabel: 'Meta',
    fg: '#1d4ed8',
    bg: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.28)',
  },
  telegram: {
    label: 'Telegram',
    shortLabel: 'Telegram',
    fg: '#0284c7',
    bg: 'rgba(14,165,233,0.10)',
    border: 'rgba(14,165,233,0.28)',
  },
};

const FALLBACK: Omit<ChannelMeta, 'type'> = {
  label: 'Outro',
  shortLabel: 'Outro',
  fg: '#475569',
  bg: 'rgba(100,116,139,0.10)',
  border: 'rgba(100,116,139,0.25)',
};

export function channelMeta(type: string | null | undefined): ChannelMeta {
  const key = (type ?? '').toLowerCase();
  const entry = (REGISTRY as Record<string, Omit<ChannelMeta, 'type'>>)[key] ?? FALLBACK;
  return { type: key || 'unknown', ...entry };
}

export function uniqueChannelTypes<T extends { channelType: string }>(items: T[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    if (item.channelType) set.add(item.channelType.toLowerCase());
  }
  return Array.from(set).sort();
}
