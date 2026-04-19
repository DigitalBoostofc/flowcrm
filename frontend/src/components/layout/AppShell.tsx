import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from './Sidebar';
import ConnectionBanner from './ConnectionBanner';
import LeadPanel from '@/components/lead-panel/LeadPanel';
import Toaster from '@/components/ui/Toaster';
import QualificationModal from '@/components/ui/QualificationModal';
import { useThemeStore } from '@/store/theme.store';
import { useSidebarStore } from '@/store/sidebar.store';

export default function AppShell({ children }: { children: ReactNode }) {
  const theme = useThemeStore(s => s.theme);
  const { collapsed, toggle } = useSidebarStore();
  const location = useLocation();
  const hideSidebar = location.pathname.startsWith('/funil');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--canvas)' }}>
      {!hideSidebar && <Sidebar />}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ConnectionBanner />
        <main className="flex-1 overflow-auto min-w-0">{children}</main>
      </div>

      <LeadPanel />
      <Toaster />
      <QualificationModal />

      {!hideSidebar && (
        <button
          onClick={toggle}
          title={collapsed ? 'Expandir' : 'Recolher'}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          style={{
            position: 'fixed',
            top: '50%',
            left: collapsed ? 40 : 204,
            transform: 'translateY(-50%)',
            zIndex: 9999,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--surface)',
            border: '1px solid var(--edge-strong)',
            color: 'var(--ink-3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'left 0.22s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" strokeWidth={2} />
            : <ChevronLeft className="w-3 h-3" strokeWidth={2} />
          }
        </button>
      )}
    </div>
  );
}
