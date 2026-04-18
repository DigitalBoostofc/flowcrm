import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Users, Settings as SettingsIcon, LogOut, ListChecks, BarChart2 } from 'lucide-react';
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
    `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
      isActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    }`;

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="px-6 py-5 border-b border-slate-800">
        <h1 className="text-xl font-bold text-emerald-400">FlowCRM</h1>
        <p className="text-xs text-slate-500 mt-0.5">{user?.name}</p>
      </div>
      <div className="px-3 py-2 border-b border-slate-800">
        <GlobalSearch />
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <NavLink to="/" end className={navClass}>
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </NavLink>
        <NavLink to="/contacts" className={navClass}>
          <Users className="w-4 h-4" />
          Contatos
        </NavLink>
        <NavLink to="/analytics" className={navClass}>
          <BarChart2 className="w-4 h-4" />
          Analytics
        </NavLink>
        <NavLink to="/settings" className={navClass}>
          <SettingsIcon className="w-4 h-4" />
          Configurações
        </NavLink>
        {isOwner && (
          <a
            href="/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <ListChecks className="w-4 h-4" />
            Filas de Jobs
          </a>
        )}
      </nav>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3 m-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sair
      </button>
    </aside>
  );
}
