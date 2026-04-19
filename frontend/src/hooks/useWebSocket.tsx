import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

interface WsContextValue {
  socket: Socket | null;
  connected: boolean;
}

const WsContext = createContext<WsContextValue>({ socket: null, connected: false });

export function WsProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore(s => s.token);
  const logout = useAuthStore(s => s.logout);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  // Conta falhas consecutivas de auth antes de deslogar
  const authFailCount = useRef(0);

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    authFailCount.current = 0;

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      authFailCount.current = 0;
      setConnected(true);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('connect_error', (err) => {
      setConnected(false);
      const msg = String(err?.message ?? '').toLowerCase();
      const isAuthError = msg.includes('unauthorized') || msg === 'jwt expired' || msg === 'invalid token';

      if (isAuthError) {
        authFailCount.current += 1;
        // Só desloga após 3 falhas consecutivas de auth para evitar falsos positivos
        if (authFailCount.current >= 3) {
          logout();
          window.location.href = '/login';
        }
      } else {
        // Erro de rede — não desloga, deixa o socket.io reconectar
        authFailCount.current = 0;
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, logout]);

  return (
    <WsContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </WsContext.Provider>
  );
}

export function useWs() {
  return useContext(WsContext);
}
