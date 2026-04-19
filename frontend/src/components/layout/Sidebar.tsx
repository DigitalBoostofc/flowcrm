import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Home, Users, Settings as SettingsIcon, LogOut,
  BarChart2, Zap, CheckSquare, Building2, Briefcase, MessageCircle, Shield,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/sidebar.store';
import GlobalSearch from './GlobalSearch';
import ThemeToggle from '@/components/ui/ThemeToggle';

const NAV_ITEMS = [
  { to: '/',           end: true,  icon: Home,           label: 'Início' },
  { to: '/analytics',              icon: BarChart2,      label: 'Analytics' },
  { to: '/tasks',                  icon: CheckSquare,    label: 'Tarefas' },
  { to: '/inbox',                  icon: MessageCircle,  label: 'Inbox' },
  { to: '/pessoas',                icon: Users,          label: 'Pessoas' },
  { to: '/companies',              icon: Building2,      label: 'Empresas' },
  { to: '/negocios',               icon: Briefcase,      label: 'Negócios' },
  { to: '/settings',               icon: SettingsIcon,   label: 'Configurações' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, logout } = useAuthStore();
  const { collapsed, toggle } = useSidebarStore();
  const isOwner = user?.role === 'owner';
  const isPlatformAdmin = !!user?.isPlatformAdmin;

  const handleLogout = () => {
    qc.clear();
    logout();
    navigate('/login');
  };

  return (
    <aside
      className="relative flex-shrink-0 flex flex-col sidebar-bg"
      style={{
        width: collapsed ? 52 : 216,
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        minHeight: '100vh',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-3 h-[52px] flex-shrink-0 gap-2.5 overflow-hidden"
        style={{ borderBottom: '1px solid var(--edge)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
            boxShadow: '0 2px 8px rgba(99,91,255,0.35)',
          }}
        >
          <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} fill="white" />
        </div>

        <div
          className="flex-1 min-w-0 overflow-hidden"
          style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}
        >
          <div className="text-sm font-semibold tracking-tight" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
            FlowCRM
          </div>
        </div>

        {!collapsed && <ThemeToggle />}
      </div>

      {/* Search */}
      <div
        className="overflow-hidden flex-shrink-0"
        style={{
          maxHeight: collapsed ? 0 : 52,
          opacity: collapsed ? 0 : 1,
          transition: 'max-height 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.15s',
          borderBottom: '1px solid var(--edge)',
        }}
      >
        <div className="px-2 py-2">
          <GlobalSearch />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-all duration-100 overflow-hidden ${
                isActive ? 'font-medium' : ''
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--brand-500)' : 'var(--ink-2)',
              background: isActive ? 'var(--brand-50)' : 'transparent',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  strokeWidth={isActive ? 2 : 1.75}
                />
                <span
                  className="whitespace-nowrap"
                  style={{
                    opacity: collapsed ? 0 : 1,
                    maxWidth: collapsed ? 0 : 160,
                    transition: 'opacity 0.15s, max-width 0.22s cubic-bezier(0.4,0,0.2,1)',
                    overflow: 'hidden',
                  }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {isPlatformAdmin && (
          <>
            <div
              className="my-2"
              style={{
                borderTop: '1px solid var(--edge)',
                opacity: collapsed ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            />
            <NavLink
              to="/admin"
              title={collapsed ? 'Admin' : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-all duration-100 overflow-hidden ${
                  isActive ? 'font-medium' : ''
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--brand-500)' : 'var(--ink-2)',
                background: isActive ? 'var(--brand-50)' : 'transparent',
              })}
            >
              {({ isActive }) => (
                <>
                  <Shield className="w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                  <span
                    className="whitespace-nowrap"
                    style={{
                      opacity: collapsed ? 0 : 1,
                      maxWidth: collapsed ? 0 : 160,
                      transition: 'opacity 0.15s, max-width 0.22s cubic-bezier(0.4,0,0.2,1)',
                      overflow: 'hidden',
                    }}
                  >
                    Admin
                  </span>
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 flex-shrink-0" style={{ borderTop: '1px solid var(--edge)' }}>
        {collapsed && (
          <div className="flex justify-center pt-2 mb-1">
            <ThemeToggle />
          </div>
        )}

        {/* User info */}
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-2.5 mt-1">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0 text-[10px] font-semibold"
              style={{ background: 'var(--brand-500)' }}
            >
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--ink-1)' }}>{user.name}</div>
              <div className="text-[10px] truncate" style={{ color: 'var(--ink-3)' }}>{user.email}</div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] transition-colors overflow-hidden"
          style={{ color: 'var(--ink-3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-bg)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
          <span
            className="whitespace-nowrap"
            style={{ opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : 160, transition: 'opacity 0.15s, max-width 0.22s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden' }}
          >
            Sair
          </span>
        </button>
      </div>
    </aside>
  );
}
