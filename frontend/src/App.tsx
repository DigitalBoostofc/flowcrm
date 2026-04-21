import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Assinar from '@/pages/Assinar';
import BillingSuccess from '@/pages/BillingSuccess';
import BillingCancel from '@/pages/BillingCancel';
import Inicio from '@/pages/Inicio';
import Pessoas from '@/pages/Pessoas';
import Negocios from '@/pages/Negocios';
import Funil from '@/pages/Funil';
import Settings from '@/pages/Settings';
import Analytics from '@/pages/Analytics';
import Tasks from '@/pages/Tasks';
import Companies from '@/pages/Companies';
import Inbox from '@/pages/Inbox';
import Admin from '@/pages/Admin';
import { FeatureLockedScreen } from '@/components/ui/FeatureGate';
import { useFeatures } from '@/hooks/useFeatures';
import Perfil from '@/pages/Perfil';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import ConnectionBanner from '@/components/layout/ConnectionBanner';
import BroadcastBanner from '@/components/layout/BroadcastBanner';
import { WsProvider } from '@/hooks/useWebSocket';
import { useInvalidateOnEvent } from '@/hooks/useInvalidateOnEvent';
import { useNotifications } from '@/hooks/useNotifications';
import { useRefreshUser } from '@/hooks/useRefreshUser';
import { useAuthStore } from '@/store/auth.store';
import { usePrefsStore } from '@/store/prefs.store';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

function AuthedLayout() {
  useInvalidateOnEvent();
  useNotifications();
  useRefreshUser();
  const { data: workspace, isLoading } = useWorkspace();

  useEffect(() => {
    usePrefsStore.getState().load();
  }, []);

  if (isLoading && !workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--ink-3)' }} />
      </div>
    );
  }

  if (workspace?.isBlocked) {
    return <Assinar />;
  }

  return (
    <AppShell>
      <ConnectionBanner />
      <BroadcastBanner />
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
        <Route path="settings" element={<Settings />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="admin" element={<Admin />} />
        <Route path="assinar" element={<Assinar />} />
        <Route path="billing/success" element={<BillingSuccess />} />
        <Route path="billing/cancel" element={<BillingCancel />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
  const token = useAuthStore((s) => s.token);

  return (
    <WsProvider>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
        <Route path="/signup" element={token ? <Navigate to="/" /> : <Signup />} />
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
