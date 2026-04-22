import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Menu, Zap } from 'lucide-react';
import Sidebar from './Sidebar';
import ConnectionBanner from './ConnectionBanner';
import LeadPanel from '@/components/lead-panel/LeadPanel';
import Toaster from '@/components/ui/Toaster';
import QualificationModal from '@/components/ui/QualificationModal';
import { useThemeStore } from '@/store/theme.store';
import { useSidebarStore } from '@/store/sidebar.store';

export default function AppShell({ children }: { children: ReactNode }) {
  const theme = useThemeStore(s => s.theme);
  const { collapsed, toggle, mobileOpen, openMobile, closeMobile } = useSidebarStore();
  const location = useLocation();
  const hideSidebar = location.pathname.startsWith('/funil');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Close mobile sidebar on route change
  useEffect(() => {
    closeMobile();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--canvas)' }}>
      {/* Mobile top bar */}
      {!hideSidebar && (
        <div
          className="md:hidden flex items-center gap-3 px-4 h-[52px] flex-shrink-0"
          style={{ borderBottom: '1px solid var(--edge)', background: 'var(--surface)' }}
        >
          <button
            onClick={openMobile}
            className="p-1.5 rounded-lg -ml-1"
            style={{ color: 'var(--ink-2)' }}
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)' }}
            >
              <Zap className="w-3 h-3 text-white" strokeWidth={2.5} fill="white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>AppexCRM</span>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Mobile overlay */}
        {!hideSidebar && mobileOpen && (
          <div
            className="fixed inset-0 z-30 md:hidden"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={closeMobile}
          />
        )}

        {/* Sidebar */}
        {!hideSidebar && <Sidebar />}

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ConnectionBanner />
          <main className="flex-1 overflow-auto min-w-0">{children}</main>
        </div>

        <LeadPanel />
      </div>

      <Toaster />
      <QualificationModal />

      {/* Desktop collapse toggle — hidden on mobile */}
      {!hideSidebar && (
        <button
          onClick={toggle}
          title={collapsed ? 'Expandir' : 'Recolher'}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          className="hidden md:flex"
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
