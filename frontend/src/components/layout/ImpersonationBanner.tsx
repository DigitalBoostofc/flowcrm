import { useAuthStore } from '@/store/auth.store';

export default function ImpersonationBanner() {
  const { adminUser, user, stopImpersonation } = useAuthStore();

  if (!adminUser) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium"
      style={{ background: '#f59e0b', color: '#1c1917' }}
    >
      <span>
        Você está visualizando como <strong>{user?.name}</strong>
      </span>
      <span style={{ opacity: 0.6 }}>·</span>
      <span style={{ opacity: 0.7 }}>Logado como: {adminUser.name}</span>
      <button
        onClick={stopImpersonation}
        className="ml-2 px-3 py-1 rounded-md text-xs font-bold transition-opacity hover:opacity-80"
        style={{ background: 'rgba(0,0,0,0.15)' }}
      >
        Encerrar sessão
      </button>
    </div>
  );
}
