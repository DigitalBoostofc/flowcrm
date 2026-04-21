import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function BillingCancel() {
  const navigate = useNavigate();
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
          style={{ background: 'rgba(220,38,38,0.1)' }}
        >
          <XCircle className="w-7 h-7" style={{ color: '#dc2626' }} />
        </div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--ink-1)' }}>
          Pagamento não concluído
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--ink-3)' }}>
          Você cancelou o checkout. Nenhuma cobrança foi feita.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/assinar')}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--brand-500)' }}
          >
            Tentar novamente
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold"
            style={{ color: 'var(--ink-2)', border: '1px solid var(--edge)' }}
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
