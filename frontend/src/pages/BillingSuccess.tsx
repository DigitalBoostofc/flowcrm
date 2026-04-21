import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';

export default function BillingSuccess() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['workspace-me'] });
    qc.invalidateQueries({ queryKey: ['me-features'] });
    qc.invalidateQueries({ queryKey: ['billing-me'] });
    const t = setTimeout(() => navigate('/'), 3500);
    return () => clearTimeout(t);
  }, [qc, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--canvas)' }}
    >
      <div
        className="max-w-md w-full text-center rounded-2xl p-10"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
      >
        <div
          className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-5"
          style={{ background: 'rgba(16,185,129,0.12)' }}
        >
          <CheckCircle2 className="w-7 h-7" style={{ color: '#10B981' }} />
        </div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--ink-1)' }}>
          Pagamento confirmado
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--ink-3)' }}>
          Sua assinatura está sendo ativada. Você será redirecionado em instantes.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--brand-500)' }}
        >
          Ir para o início
        </button>
      </div>
    </div>
  );
}
