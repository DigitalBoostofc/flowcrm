import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Assinar from '@/pages/Assinar';
import Inicio from '@/pages/Inicio';
import Pessoas from '@/pages/Pessoas';
import Negocios from '@/pages/Negocios';
import Funil from '@/pages/Funil';
import Settings from '@/pages/Settings';
import Analytics from '@/pages/Analytics';
import Tasks from '@/pages/Tasks';
import Companies from '@/pages/Companies';
import Inbox from '@/pages/Inbox';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import ConnectionBanner from '@/components/layout/ConnectionBanner';
import { WsProvider } from '@/hooks/useWebSocket';
import { useInvalidateOnEvent } from '@/hooks/useInvalidateOnEvent';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Loader2 } from 'lucide-react';

function AuthedLayout() {
  useInvalidateOnEvent();
  useNotifications();
  const { data: workspace, isLoading } = useWorkspace();

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
      <Routes>
        <Route index element={<Inicio />} />
        <Route path="pessoas" element={<Pessoas />} />
        <Route path="negocios" element={<Negocios />} />
        <Route path="funil" element={<Funil />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="companies" element={<Companies />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="assinar" element={<Assinar />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
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
