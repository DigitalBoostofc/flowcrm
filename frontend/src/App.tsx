import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Termos from '@/pages/legal/Termos';
import Privacidade from '@/pages/legal/Privacidade';
import Reembolso from '@/pages/legal/Reembolso';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import ConnectionBanner from '@/components/layout/ConnectionBanner';
import BroadcastBanner from '@/components/layout/BroadcastBanner';
import ImpersonationBanner from '@/components/layout/ImpersonationBanner';
import { FeatureLockedScreen } from '@/components/ui/FeatureGate';
import { useFeatures } from '@/hooks/useFeatures';
import { WsProvider } from '@/hooks/useWebSocket';
import { useInvalidateOnEvent } from '@/hooks/useInvalidateOnEvent';
import { useNotifications } from '@/hooks/useNotifications';
import { useRefreshUser } from '@/hooks/useRefreshUser';
import { useAuthStore } from '@/store/auth.store';
import { usePrefsStore } from '@/store/prefs.store';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Loader2 } from 'lucide-react';

// Code-splitting por rota: cada page vira um chunk próprio carregado on-demand.
// Reduz o bundle inicial — login/signup/legal não puxam o peso do app autenticado.
const Inicio = lazy(() => import('@/pages/Inicio'));
const Pessoas = lazy(() => import('@/pages/Pessoas'));
const Negocios = lazy(() => import('@/pages/Negocios'));
const Funil = lazy(() => import('@/pages/Funil'));
const Settings = lazy(() => import('@/pages/Settings'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Tasks = lazy(() => import('@/pages/Tasks'));
const Companies = lazy(() => import('@/pages/Companies'));
const Inbox = lazy(() => import('@/pages/Inbox'));
const Calendario = lazy(() => import('@/pages/Calendario'));
const Perfil = lazy(() => import('@/pages/Perfil'));
const Admin = lazy(() => import('@/pages/Admin'));
const Assinar = lazy(() => import('@/pages/Assinar'));
const BillingSuccess = lazy(() => import('@/pages/BillingSuccess'));
const BillingCancel = lazy(() => import('@/pages/BillingCancel'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const WidgetPage = lazy(() => import('@/pages/WidgetPage'));
const AgendaMobile = lazy(() => import('@/pages/AgendaMobile'));

function PageFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--ink-3)' }} />
    </div>
  );
}

function AuthedLayout() {
  useInvalidateOnEvent();
  useNotifications();
  useRefreshUser();
  const { data: workspace, isLoading } = useWorkspace();
  const me = useAuthStore((s) => s.user);

  useEffect(() => {
    usePrefsStore.getState().load();
  }, []);

  // Agents only have access to the mobile agenda view
  if (me?.role === 'agent') return <Navigate to="/mobile" replace />;

  if (isLoading && !workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--ink-3)' }} />
      </div>
    );
  }

  if (workspace?.isBlocked) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Assinar />
      </Suspense>
    );
  }

  return (
    <AppShell>
      <ImpersonationBanner />
      <ConnectionBanner />
      <BroadcastBanner />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route index element={<Navigate to="/funil" replace />} />
          <Route path="inicio" element={<Inicio />} />
          <Route path="pessoas" element={<Pessoas />} />
          <Route path="negocios" element={<Negocios />} />
          <Route path="funil" element={<Funil />} />
          <Route path="tasks" element={<GatedTasks />} />
          <Route path="inbox" element={<GatedInbox />} />
          <Route path="companies" element={<Companies />} />
          <Route path="analytics" element={<GatedAnalytics />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="settings" element={<Settings />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="admin" element={<Admin />} />
          <Route path="assinar" element={<Assinar />} />
          <Route path="billing/success" element={<BillingSuccess />} />
          <Route path="billing/cancel" element={<BillingCancel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

function GatedInbox() {
  const { has, isLoading } = useFeatures();
  if (isLoading) return null;
  if (!has('inbox')) return <FeatureLockedScreen feature="inbox" />;
  return <Inbox />;
}

function GatedAnalytics() {
  const { has, isLoading } = useFeatures();
  if (isLoading) return null;
  if (!has('analytics')) return <FeatureLockedScreen feature="analytics" />;
  return <Analytics />;
}

function GatedTasks() {
  const { has, isLoading } = useFeatures();
  if (isLoading) return null;
  if (!has('tasks')) return <FeatureLockedScreen feature="tasks" />;
  return <Tasks />;
}

export default function App() {
  const { token, user } = useAuthStore();

  return (
    <WsProvider>
      <Routes>
        <Route
          path="/login"
          element={token ? <Navigate to={user?.role === 'agent' ? '/mobile' : '/'} replace /> : <Login />}
        />
        <Route
          path="/signup"
          element={token ? <Navigate to="/" replace /> : <Signup />}
        />
        <Route path="/termos" element={<Termos />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/reembolso" element={<Reembolso />} />
        <Route
          path="/widget/:workspaceId"
          element={
            <Suspense fallback={<PageFallback />}>
              <WidgetPage />
            </Suspense>
          }
        />
        {/* Mobile agenda — no sidebar, for agents */}
        <Route
          path="/mobile"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageFallback />}>
                <AgendaMobile />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AuthedLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </WsProvider>
  );
}
