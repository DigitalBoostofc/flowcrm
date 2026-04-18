import { useEffect, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import LeadPanel from '@/components/lead-panel/LeadPanel';
import Toaster from '@/components/ui/Toaster';
import { useThemeStore } from '@/store/theme.store';

export default function AppShell({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--canvas)' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
      <LeadPanel />
      <Toaster />
    </div>
  );
}
