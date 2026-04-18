import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Users, Settings as SettingsIcon, LogOut, ListChecks, BarChart2, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import GlobalSearch from './GlobalSearch';

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
        ? 'bg-brand-500/10 text-brand-400 font-medium'
        : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
    }`;

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col border-r border-white/[0.06]"
      style={{ background: 'linear-gradient(180deg, #0c0c1a 0%, #08081a 100%)' }}
    >
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            <Zap className="w-3.5 h-3.5 text-white" fill="currentColor" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100 tracking-tight">FlowCRM</div>
            <div className="text-[10px] text-slate-600 truncate">{user?.name}</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-white/[0.04]">
        <GlobalSearch />
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <NavLink to="/" end className={navClass}>
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-r-full" />
              )}
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              Dashboard
            </>
          )}
        </NavLink>
        <NavLink to="/analytics" className={navClass}>
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-r-full" />
              )}
              <BarChart2 className="w-4 h-4 flex-shrink-0" />
              Analytics
            </>
          )}
        </NavLink>
        <NavLink to="/contacts" className={navClass}>
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-r-full" />
              )}
              <Users className="w-4 h-4 flex-shrink-0" />
              Contatos
            </>
          )}
        </NavLink>
        <NavLink to="/settings" className={navClass}>
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-r-full" />
              )}
              <SettingsIcon className="w-4 h-4 flex-shrink-0" />
              Configurações
            </>
          )}
        </NavLink>
        {isOwner && (
          <a
            href="/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-400 hover:bg-white/[0.04] transition-all"
          >
            <ListChecks className="w-4 h-4 flex-shrink-0" />
            Filas de Jobs
          </a>
        )}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-white/[0.06]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-red-400 hover:bg-red-500/[0.08] transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
