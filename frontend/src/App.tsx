import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Contacts from '@/pages/Contacts';
import Settings from '@/pages/Settings';
import Analytics from '@/pages/Analytics';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import ConnectionBanner from '@/components/layout/ConnectionBanner';
import { WsProvider } from '@/hooks/useWebSocket';
import { useInvalidateOnEvent } from '@/hooks/useInvalidateOnEvent';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/store/auth.store';

function AuthedLayout() {
  useInvalidateOnEvent();
  useNotifications();
  return (
    <AppShell>
      <ConnectionBanner />
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
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
