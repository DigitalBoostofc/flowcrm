import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import { useAuthStore } from '@/store/auth.store';

export default function App() {
  const token = useAuthStore((s) => s.token);

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
      <Route path="/*" element={token ? <div>Logged in — TODO Task 3</div> : <Navigate to="/login" />} />
    </Routes>
  );
}
