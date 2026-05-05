import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState = 'unsupported' | 'ios' | 'ready' | 'installed';

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<InstallState>(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return 'installed';
    // iOS Safari (no beforeinstallprompt support)
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIos) return 'ios';
    return 'unsupported';
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState('ready');
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setState('installed'));
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setState('installed');
    setDeferredPrompt(null);
  }

  return { state, install };
}
