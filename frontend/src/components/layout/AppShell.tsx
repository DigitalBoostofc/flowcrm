import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from './Sidebar';
import LeadPanel from '@/components/lead-panel/LeadPanel';
import Toaster from '@/components/ui/Toaster';
import QualificationModal from '@/components/ui/QualificationModal';
import { useThemeStore } from '@/store/theme.store';
import { useSidebarStore } from '@/store/sidebar.store';

export default function AppShell({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const { collapsed, toggle } = useSidebarStore();
  const location = useLocation();
  const hideSidebar = location.pathname.startsWith('/funil');

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
      {!hideSidebar && <Sidebar />}
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
      <LeadPanel />
      <Toaster />
      <QualificationModal />

      {!hideSidebar && (
        <button
          onClick={toggle}
          title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          className="flex items-center justify-center shadow-md hover:scale-110 active:scale-95"
          style={{
            position: 'fixed',
            top: '50%',
            left: collapsed ? '48px' : '212px',
            transform: 'translateY(-50%)',
            zIndex: 9999,
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'var(--surface-raised)',
            border: '1px solid var(--edge-strong)',
            color: 'var(--ink-2)',
            cursor: 'pointer',
            transition: 'left 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s ease',
          }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}
