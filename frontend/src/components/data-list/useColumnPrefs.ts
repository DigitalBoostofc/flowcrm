import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef, ColumnPrefs } from './types';
import { usePrefsStore } from '@/store/prefs.store';

const STORAGE_VERSION = 'v2';

function storageKey(id: string) {
  return `flowcrm:cols:${STORAGE_VERSION}:${id}`;
}

function prefKey(id: string) {
  return `cols:${STORAGE_VERSION}:${id}`;
}

function buildDefaults<T>(columns: ColumnDef<T>[]): ColumnPrefs {
  return {
    order: columns.map((c) => c.key),
    hidden: columns.filter((c) => c.hiddenByDefault).map((c) => c.key),
    widths: Object.fromEntries(columns.map((c) => [c.key, c.defaultWidth])),
  };
}

function readStored(id: string): Partial<ColumnPrefs> | null {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Partial<ColumnPrefs>;
  } catch {
    return null;
  }
}

function mergePrefs<T>(columns: ColumnDef<T>[], stored: Partial<ColumnPrefs> | null): ColumnPrefs {
  const defaults = buildDefaults(columns);
  if (!stored) return defaults;

  const knownKeys = new Set(columns.map((c) => c.key));
  const storedOrder = Array.isArray(stored.order) ? stored.order.filter((k) => knownKeys.has(k)) : [];
  const leftover = defaults.order.filter((k) => !storedOrder.includes(k));
  const order = [...storedOrder, ...leftover];

  const storedHidden = Array.isArray(stored.hidden) ? stored.hidden.filter((k) => knownKeys.has(k)) : defaults.hidden;
  const requiredKeys = new Set(columns.filter((c) => c.required).map((c) => c.key));
  const hidden = storedHidden.filter((k) => !requiredKeys.has(k));

  const widths: Record<string, number> = { ...defaults.widths };
  if (stored.widths && typeof stored.widths === 'object') {
    for (const [k, v] of Object.entries(stored.widths)) {
      if (knownKeys.has(k) && typeof v === 'number' && Number.isFinite(v) && v > 0) {
        widths[k] = Math.round(v);
      }
    }
  }
  return { order, hidden, widths };
}

export interface UseColumnPrefsResult<T> {
  prefs: ColumnPrefs;
  visibleColumns: ColumnDef<T>[];
  setVisible: (keys: string[]) => void;
  setOrder: (keys: string[]) => void;
  setWidth: (key: string, width: number) => void;
  reset: () => void;
}

export function useColumnPrefs<T>(id: string, columns: ColumnDef<T>[]): UseColumnPrefsResult<T> {
  const prefsLoaded = usePrefsStore((s) => s.loaded);
  const remoteValue = usePrefsStore((s) => s.values[prefKey(id)] as Partial<ColumnPrefs> | undefined);
  const setRemote = usePrefsStore((s) => s.set);

  const [prefs, setPrefs] = useState<ColumnPrefs>(() => mergePrefs(columns, readStored(id)));

  // Quando prefs vêm do backend, aplica (backend vence localStorage)
  useEffect(() => {
    if (!prefsLoaded) return;
    if (remoteValue) {
      setPrefs(mergePrefs(columns, remoteValue));
    }
    // Se remoteValue é undefined, mantém o que já está (vindo do localStorage ou defaults)
    // e a primeira gravação vai sincronizar pro backend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoaded, id]);

  // Persiste em localStorage (cache offline) e backend (fonte da verdade)
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(id), JSON.stringify(prefs));
    } catch {
      // storage quota or disabled; ignore
    }
    if (prefsLoaded) {
      setRemote(prefKey(id), prefs);
    }
  }, [id, prefs, prefsLoaded, setRemote]);

  const byKey = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);

  const visibleColumns = useMemo(() => {
    const hiddenSet = new Set(prefs.hidden);
    return prefs.order
      .map((k) => byKey.get(k))
      .filter((c): c is ColumnDef<T> => !!c && !hiddenSet.has(c.key));
  }, [prefs, byKey]);

  const setVisible = useCallback(
    (keys: string[]) => {
      setPrefs((prev) => {
        const keep = new Set(keys);
        const requiredKeys = columns.filter((c) => c.required).map((c) => c.key);
        for (const k of requiredKeys) keep.add(k);
        const hidden = columns.map((c) => c.key).filter((k) => !keep.has(k));
        return { ...prev, hidden };
      });
    },
    [columns],
  );

  const setOrder = useCallback((keys: string[]) => {
    setPrefs((prev) => ({ ...prev, order: keys }));
  }, []);

  const setWidth = useCallback(
    (key: string, width: number) => {
      const col = byKey.get(key);
      const min = col?.minWidth ?? 80;
      const clamped = Math.max(min, Math.min(800, Math.round(width)));
      setPrefs((prev) => ({ ...prev, widths: { ...prev.widths, [key]: clamped } }));
    },
    [byKey],
  );

  const reset = useCallback(() => {
    setPrefs(buildDefaults(columns));
  }, [columns]);

  return { prefs, visibleColumns, setVisible, setOrder, setWidth, reset };
}
