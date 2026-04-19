import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { CalendarDays, CheckCircle2, AlertCircle, ExternalLink, Unlink, Loader2 } from 'lucide-react';
import { getGoogleAuthUrl, getGoogleStatus, disconnectGoogle } from '@/api/integrations';

export default function IntegrationsTab() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();

  // Detecta retorno do OAuth e limpa params da URL
  const oauthStatus = params.get('status');
  useEffect(() => {
    if (oauthStatus) {
      qc.invalidateQueries({ queryKey: ['google-status'] });
      setParams(p => { p.delete('status'); return p; }, { replace: true });
    }
  }, [oauthStatus, qc, setParams]);

  const { data: status, isLoading } = useQuery({
    queryKey: ['google-status'],
    queryFn: getGoogleStatus,
  });

  const connectMut = useMutation({
    mutationFn: async () => {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    },
  });

  const disconnectMut = useMutation({
    mutationFn: disconnectGoogle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['google-status'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">Integrações</h2>
        <p className="page-subtitle">Conecte ferramentas externas para automatizar seu fluxo de trabalho.</p>
      </div>

      {/* Google Calendar card */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-start gap-4">
          {/* Google Calendar icon */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.15)' }}
          >
            <CalendarDays className="w-5 h-5" style={{ color: '#4285F4' }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
                Google Calendar
              </span>
              {status?.connected && (
                <span className="badge badge-success">
                  <CheckCircle2 className="w-3 h-3" /> Conectado
                </span>
              )}
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              Tarefas criadas no FlowCRM aparecem automaticamente no Google Calendar
              dos responsáveis que tiverem a integração ativa.
            </p>

            {status?.connected && status.email && (
              <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--ink-2)' }}>
                Conta: {status.email}
              </p>
            )}

            {oauthStatus === 'error' && (
              <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: 'var(--danger)' }}>
                <AlertCircle className="w-3.5 h-3.5" />
                Erro ao conectar. Tente novamente.
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ink-3)' }} />
            ) : status?.connected ? (
              <button
                onClick={() => disconnectMut.mutate()}
                disabled={disconnectMut.isPending}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
                style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(229,72,77,0.2)' }}
              >
                <Unlink className="w-3.5 h-3.5" />
                Desconectar
              </button>
            ) : (
              <button
                onClick={() => connectMut.mutate()}
                disabled={connectMut.isPending}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-white transition-opacity disabled:opacity-50"
                style={{ background: '#4285F4' }}
              >
                {connectMut.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                Conectar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)' }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--ink-2)' }}>Como funciona</p>
        <ol className="space-y-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>
          <li className="flex items-start gap-2">
            <span className="font-semibold flex-shrink-0" style={{ color: 'var(--brand-500)' }}>1.</span>
            Cada usuário conecta sua própria conta Google nas Configurações → Integrações
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold flex-shrink-0" style={{ color: 'var(--brand-500)' }}>2.</span>
            Ao criar uma tarefa com data e responsável, o evento é adicionado automaticamente ao Google Calendar do responsável
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold flex-shrink-0" style={{ color: 'var(--brand-500)' }}>3.</span>
            Ao excluir a tarefa, o evento é removido do Google Calendar
          </li>
        </ol>
      </div>
    </div>
  );
}
