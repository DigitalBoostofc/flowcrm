import { NavLink } from 'react-router-dom';
import {
  Home, Users, Settings as SettingsIcon, LogOut,
  BarChart2, Zap, CheckSquare, Building2, Briefcase, MessageCircle, Shield, CalendarDays,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/sidebar.store';
import type { User } from '@/types/api';
import { useLogout } from '@/hooks/useLogout';
import { useFeatures } from '@/hooks/useFeatures';
import { Lock } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Avatar from '@/components/ui/Avatar';

type NavItem = { to: string; icon: typeof Home; label: string; feature?: string };

const NAV_ITEMS: NavItem[] = [
  { to: '/inicio',     icon: Home,          label: 'Início' },
  { to: '/analytics',  icon: BarChart2,     label: 'Analytics',     feature: 'analytics' },
  { to: '/tasks',      icon: CheckSquare,   label: 'Tarefas',       feature: 'tasks' },
  { to: '/calendario', icon: CalendarDays,  label: 'Agenda' },
  { to: '/inbox',      icon: MessageCircle, label: 'Inbox',         feature: 'inbox' },
  { to: '/pessoas',    icon: Users,         label: 'Pessoas' },
  { to: '/companies',  icon: Building2,     label: 'Empresas' },
  { to: '/funil',      icon: Briefcase,     label: 'Negócios' },
  { to: '/settings',   icon: SettingsIcon,  label: 'Configurações' },
];

export default function Sidebar() {
  const handleLogout = useLogout();
  const { user } = useAuthStore();
  const { collapsed, toggle, mobileOpen, closeMobile } = useSidebarStore();
  const { has } = useFeatures();
  const isOwner = user?.role === 'owner';
  const isPlatformAdmin = !!user?.isPlatformAdmin;

  // On mobile: full-width drawer. On desktop: collapsible sidebar.
  return (
    <aside
      className="flex-shrink-0 flex flex-col sidebar-bg"
      style={{
        // Desktop: static, collapsible
        width: collapsed ? 52 : 216,
        minHeight: '100vh',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        // Mobile: fixed drawer
        position: undefined,
        zIndex: undefined,
      } as React.CSSProperties}
    >
      {/* Mobile drawer wrapper — fixed overlay */}
      <div
        className="md:contents"
        style={{} as React.CSSProperties}
      />
      <MobileSidebarInner
        user={user}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        closeMobile={closeMobile}
        toggle={toggle}
        handleLogout={handleLogout}
        has={has}
        isPlatformAdmin={isPlatformAdmin}
        isOwner={isOwner}
      />
    </aside>
  );
}

function MobileSidebarInner({
  user, collapsed, mobileOpen, closeMobile, toggle, handleLogout, has, isPlatformAdmin,
}: {
  user: User | null;
  collapsed: boolean;
  mobileOpen: boolean;
  closeMobile: () => void;
  toggle: () => void;
  handleLogout: () => void;
  has: (f: string) => boolean;
  isPlatformAdmin: boolean;
  isOwner: boolean;
}) {
  return (
    <>
      {/* Desktop sidebar (static) */}
      <div
        className="hidden md:flex flex-col flex-1 sidebar-bg"
        style={{
          width: collapsed ? 52 : 216,
          minHeight: '100vh',
          transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
          flexShrink: 0,
        }}
      >
        <SidebarContent
          user={user}
          collapsed={collapsed}
          handleLogout={handleLogout}
          has={has}
          isPlatformAdmin={isPlatformAdmin}
        />
      </div>

      {/* Mobile drawer (fixed, slide in/out) */}
      <div
        className="md:hidden fixed inset-y-0 left-0 z-40 flex flex-col sidebar-bg"
        style={{
          width: 256,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: mobileOpen ? 'var(--shadow-xl, 0 20px 60px rgba(0,0,0,.25))' : 'none',
        }}
      >
        <SidebarContent
          user={user}
          collapsed={false}
          handleLogout={handleLogout}
          has={has}
          isPlatformAdmin={isPlatformAdmin}
          onNavClick={closeMobile}
        />
      </div>
    </>
  );
}

function SidebarContent({
  user, collapsed, handleLogout, has, isPlatformAdmin, onNavClick,
}: {
  user: User | null;
  collapsed: boolean;
  handleLogout: () => void;
  has: (f: string) => boolean;
  isPlatformAdmin: boolean;
  onNavClick?: () => void;
}) {
  return (
    <div className="flex flex-col h-full" style={{ minHeight: '100vh' }}>
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
            AppexCRM
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
        {NAV_ITEMS.map((item) => {
          const locked = item.feature ? !has(item.feature) : false;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              title={collapsed ? item.label : undefined}
              onClick={onNavClick}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-[13px] transition-all duration-100 overflow-hidden ${
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
                  <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                  <span
                    className="whitespace-nowrap flex-1"
                    style={{
                      opacity: collapsed ? 0 : 1,
                      maxWidth: collapsed ? 0 : 180,
                      transition: 'opacity 0.15s, max-width 0.22s cubic-bezier(0.4,0,0.2,1)',
                      overflow: 'hidden',
                    }}
                  >
                    {item.label}
                  </span>
                  {locked && !collapsed && (
                    <Lock className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--ink-3)' }} />
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {isPlatformAdmin && (
          <>
            <div className="my-2" style={{ borderTop: '1px solid var(--edge)', opacity: collapsed ? 0.5 : 1, transition: 'opacity 0.15s' }} />
            <NavLink
              to="/admin"
              title={collapsed ? 'Admin' : undefined}
              onClick={onNavClick}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-[13px] transition-all duration-100 overflow-hidden ${
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
                    style={{ opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : 180, transition: 'opacity 0.15s, max-width 0.22s', overflow: 'hidden' }}
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

        {!collapsed && user && (
          <NavLink
            to="/perfil"
            title="Meu perfil"
            onClick={onNavClick}
            className="flex items-center gap-2.5 px-2 py-2.5 mt-1 rounded-md transition-colors"
            style={({ isActive }) => ({ background: isActive ? 'var(--brand-50)' : 'transparent' })}
          >
            <Avatar name={user.name} url={user.avatarUrl} size={24} />
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--ink-1)' }}>{user.name}</div>
              <div className="text-[10px] truncate" style={{ color: 'var(--ink-3)' }}>{user.email}</div>
            </div>
          </NavLink>
        )}
        {collapsed && user && (
          <NavLink to="/perfil" title="Meu perfil" className="flex justify-center py-2 mt-1 rounded-md">
            <Avatar name={user.name} url={user.avatarUrl} size={28} />
          </NavLink>
        )}

        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          className="flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-md text-[13px] transition-colors overflow-hidden"
          style={{ color: 'var(--ink-3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-bg)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
          <span
            className="whitespace-nowrap"
            style={{ opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : 180, transition: 'opacity 0.15s, max-width 0.22s', overflow: 'hidden' }}
          >
            Sair
          </span>
        </button>
      </div>
    </div>
  );
}
