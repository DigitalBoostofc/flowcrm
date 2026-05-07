/// <reference types="vite/client" />
import { lazy, type ComponentType } from 'react';

/**
 * lazy() com retry automático.
 *
 * Quando um chunk falha (deploy novo, erro de rede), tenta recarregar
 * a página uma vez. Na segunda tentativa (já com o chunk novo),
 * o import funciona normalmente.
 *
 * Em dev/HMR não faz retry — deixa o erro subir pro ErrorBoundary.
 */
export default function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      // Em dev, não tenta recarregar — só propaga o erro
      if (import.meta.env.DEV) throw err;

      // Se já tentou recarregar e falhou de novo, propaga
      const key = `lazy_retry_${factory.toString().length}`;
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
        throw err;
      }

      // Marca que já tentou e recarrega a página
      sessionStorage.setItem(key, '1');
      window.location.reload();

      // Nunca alcança aqui, mas TypeScript quer um return
      return new Promise(() => {});
    }
  });
}
