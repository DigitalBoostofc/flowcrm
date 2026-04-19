import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, Settings as SettingsIcon, LogOut,
  ListChecks, BarChart2, Zap,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/sidebar.store';
import GlobalSearch from './GlobalSearch';
import ThemeToggle from '@/components/ui/ThemeToggle';

const NAV_ITEMS = [
  { to: '/', end: true,  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics',    icon: BarChart2,        label: 'Analytics' },
  { to: '/contacts',     icon: Users,            label: 'Contatos' },
  { to: '/settings',     icon: SettingsIcon,     label: 'Configurações' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const { collapsed, toggle } = useSidebarStore();
  const isOwner = user?.role === 'owner';

  const handleLogout = () => {
    queryClient.clear();
    logout();
    navigate('/login');
  };

  return (
    <aside
      className="relative flex-shrink-0 flex flex-col sidebar-bg border-r overflow-hidden"
      style={{
        borderColor: 'var(--edge)',
        width: collapsed ? '60px' : '224px',
        transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >

      {/* Logo */}
      <div
        className="px-3 pt-5 pb-4 border-b flex-shrink-0 overflow-hidden"
        style={{ borderColor: 'var(--edge)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            <Zap className="w-3.5 h-3.5 text-white" fill="currentColor" />
          </div>

          <div
            className="min-w-0 flex-1 overflow-hidden"
            style={{
              opacity: collapsed ? 0 : 1,
              transition: 'opacity 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <div className="text-sm font-semibold tracking-tight" style={{ color: 'var(--ink-1)' }}>
              FlowCRM
            </div>
            <div className="text-[10px] truncate" style={{ color: 'var(--ink-3)' }}>
              {user?.name}
            </div>
          </div>

          {!collapsed && <ThemeToggle />}
        </div>
      </div>

      {/* Search — hidden when collapsed */}
      <div
        className="border-b flex-shrink-0 overflow-hidden"
        style={{
          borderColor: 'var(--edge)',
          maxHeight: collapsed ? '0px' : '56px',
          opacity: collapsed ? 0 : 1,
          transition: 'max-height 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.15s ease',
        }}
      >
        <div className="px-2 py-2">
          <GlobalSearch />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 overflow-hidden ${
                isActive
                  ? 'bg-brand-500/10 text-brand-500 font-medium dark:text-brand-400'
                  : 'hover:bg-[var(--surface-hover)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r-full dark:bg-brand-400" />
                )}
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: isActive ? undefined : 'var(--ink-2)' }}
                />
                <span
                  className="whitespace-nowrap overflow-hidden"
                  style={{
                    color: isActive ? undefined : 'var(--ink-2)',
                    opacity: collapsed ? 0 : 1,
                    maxWidth: collapsed ? '0px' : '200px',
                    transition: 'opacity 0.15s ease, max-width 0.22s cubic-bezier(0.4,0,0.2,1)',
                  }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {isOwner && (
          <a
            href="/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? 'Filas de Jobs' : undefined}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-[var(--surface-hover)] overflow-hidden"
            style={{ color: 'var(--ink-3)' }}
          >
            <ListChecks className="w-4 h-4 flex-shrink-0" />
            <span
              className="whitespace-nowrap overflow-hidden"
              style={{
                opacity: collapsed ? 0 : 1,
                maxWidth: collapsed ? '0px' : '200px',
                transition: 'opacity 0.15s ease, max-width 0.22s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              Filas de Jobs
            </span>
          </a>
        )}
      </nav>

      {/* Bottom: theme toggle (collapsed only) + logout */}
      <div className="p-2 border-t flex-shrink-0" style={{ borderColor: 'var(--edge)' }}>
        {collapsed && (
          <div className="flex justify-center mb-1">
            <ThemeToggle />
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all hover:text-red-500 hover:bg-red-500/[0.08] overflow-hidden"
          style={{ color: 'var(--ink-3)' }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span
            className="whitespace-nowrap overflow-hidden"
            style={{
              opacity: collapsed ? 0 : 1,
              maxWidth: collapsed ? '0px' : '200px',
              transition: 'opacity 0.15s ease, max-width 0.22s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            Sair
          </span>
        </button>
      </div>
    </aside>
  );
}
