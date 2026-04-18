import { WifiOff } from 'lucide-react';
import { useWs } from '@/hooks/useWebSocket';

export default function ConnectionBanner() {
  const { connected } = useWs();

  if (connected) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-sm"
      style={{
        background: 'rgba(239,68,68,0.08)',
        borderBottom: '1px solid rgba(239,68,68,0.25)',
        color: '#ef4444',
      }}
    >
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      Sem conexão em tempo real — atualizações podem atrasar
    </div>
  );
}
