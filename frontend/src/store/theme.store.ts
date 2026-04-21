import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usePrefsStore } from './prefs.store';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const PREF_KEY = 'theme';

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        const prefs = usePrefsStore.getState();
        if (prefs.loaded) prefs.set(PREF_KEY, theme);
      },
      toggle: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },
    }),
    { name: 'flowcrm-theme' },
  ),
);

function applyRemoteTheme(state: ReturnType<typeof usePrefsStore.getState>) {
  if (!state.loaded) return;
  const remote = state.values[PREF_KEY];
  if (remote === 'dark' || remote === 'light') {
    if (useThemeStore.getState().theme !== remote) {
      useThemeStore.setState({ theme: remote });
    }
  } else {
    const local = useThemeStore.getState().theme;
    state.set(PREF_KEY, local);
  }
}

// Caso as prefs já tenham carregado antes deste módulo ser importado
applyRemoteTheme(usePrefsStore.getState());

usePrefsStore.subscribe((state, prev) => {
  if (state.loaded && !prev.loaded) applyRemoteTheme(state);
});
