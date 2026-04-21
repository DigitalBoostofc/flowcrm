import { create } from 'zustand';
import { getAllPreferences, setPreference } from '@/api/preferences';

interface PrefsState {
  loaded: boolean;
  loading: boolean;
  values: Record<string, unknown>;
  load: () => Promise<void>;
  get: <T = unknown>(key: string, fallback: T) => T;
  set: (key: string, value: unknown) => void;
  reset: () => void;
}

const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 400;

function flush(key: string, value: unknown) {
  setPreference(key, value).catch((err) => {
    console.warn(`[prefs] falha ao salvar "${key}"`, err);
  });
}

export const usePrefsStore = create<PrefsState>((set, get) => ({
  loaded: false,
  loading: false,
  values: {},

  async load() {
    if (get().loading || get().loaded) return;
    set({ loading: true });
    try {
      const values = await getAllPreferences();
      set({ values, loaded: true, loading: false });
    } catch (err) {
      console.warn('[prefs] falha ao carregar preferências', err);
      set({ loaded: true, loading: false });
    }
  },

  get<T>(key: string, fallback: T): T {
    const state = get();
    if (!state.loaded) return fallback;
    const v = state.values[key];
    return (v === undefined ? fallback : (v as T));
  },

  set(key, value) {
    set((s) => ({ values: { ...s.values, [key]: value } }));
    const existing = pendingWrites.get(key);
    if (existing) clearTimeout(existing);
    const handle = setTimeout(() => {
      pendingWrites.delete(key);
      flush(key, value);
    }, DEBOUNCE_MS);
    pendingWrites.set(key, handle);
  },

  reset() {
    for (const h of pendingWrites.values()) clearTimeout(h);
    pendingWrites.clear();
    set({ loaded: false, loading: false, values: {} });
  },
}));
