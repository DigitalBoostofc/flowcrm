import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Users, Settings as SettingsIcon, LogOut, ListChecks, BarChart2, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import GlobalSearch from './GlobalSearch';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function Sidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const isOwner = user?.role === 'owner';

  const handleLogout = () => {
    queryClient.clear();
    logout();
    navigate('/login');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
      isActive
        ? 'bg-brand-500/10 text-brand-500 font-medium dark:text-brand-400'
        : 'hover:bg-[var(--surface-hover)]'
    }`;

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col sidebar-bg border-r"
      style={{ borderColor: 'var(--edge)' }}
    >
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b" style={{ borderColor: 'var(--edge)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            <Zap className="w-3.5 h-3.5 text-white" fill="currentColor" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold tracking-tight" style={{ color: 'var(--ink-1)' }}>
              FlowCRM
            </div>
            <div className="text-[10px] truncate" style={{ color: 'var(--ink-3)' }}>
              {user?.name}
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b" style={{ borderColor: 'var(--edge)' }}>
        <GlobalSearch />
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <NavLink to="/" end className={navClass}>
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r-full dark:bg-brand-400" />
              )}
              <LayoutDashboard
                className="w-4 h-4 flex-shrink-0"
                style={{ color: isActive ? undefined : 'var(--ink-2)' }}
              />
              <span style={{ color: isActive ? undefined : 'var(--ink-2)' }}>Dashboard</span>
            </>
          )}
        </NavLink>
        <NavLink to="/analytics" className={navClass}>
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r-full dark:bg-brand-400" />
              )}
              <BarChart2
                className="w-4 h-4 flex-shrink-0"
                style={{ color: isActive ? undefined : 'var(--ink-2)' }}
              />
              <span style={{ color: isActive ? undefined : 'var(--ink-2)' }}>Analytics</span>
            </>
          )}
        </NavLink>
        <NavLink to="/contacts" className={navClass}>
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r-full dark:bg-brand-400" />
              )}
              <Users
                className="w-4 h-4 flex-shrink-0"
                style={{ color: isActive ? undefined : 'var(--ink-2)' }}
              />
              <span style={{ color: isActive ? undefined : 'var(--ink-2)' }}>Contatos</span>
            </>
          )}
        </NavLink>
        <NavLink to="/settings" className={navClass}>
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r-full dark:bg-brand-400" />
              )}
              <SettingsIcon
                className="w-4 h-4 flex-shrink-0"
                style={{ color: isActive ? undefined : 'var(--ink-2)' }}
              />
              <span style={{ color: isActive ? undefined : 'var(--ink-2)' }}>Configurações</span>
            </>
          )}
        </NavLink>
        {isOwner && (
          <a
            href="/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-3)' }}
          >
            <ListChecks className="w-4 h-4 flex-shrink-0" />
            Filas de Jobs
          </a>
        )}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t" style={{ borderColor: 'var(--edge)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all hover:text-red-500 hover:bg-red-500/[0.08]"
          style={{ color: 'var(--ink-3)' }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
