import { WifiOff } from 'lucide-react';
import { useWs } from '@/hooks/useWebSocket';

export default function ConnectionBanner() {
  const { connected } = useWs();

  if (connected) return null;

  return (
    <div className="bg-red-600/20 border-b border-red-500/40 text-red-300 px-4 py-2 flex items-center gap-2 text-sm">
      <WifiOff className="w-4 h-4" />
      Sem conexão em tempo real — atualizações podem atrasar
    </div>
  );
}
