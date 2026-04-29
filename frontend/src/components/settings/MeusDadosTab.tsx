import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download, Trash2, AlertTriangle, Loader2, CheckCircle2, Undo2 } from 'lucide-react';
import { downloadDataExport, scheduleAccountDeletion, cancelAccountDeletion } from '@/api/me';
import { useAuthStore } from '@/store/auth.store';

export default function MeusDadosTab() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const [exportedAt, setExportedAt] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const pendingDeletion = user?.scheduledDeletionAt ?? null;

  const exportMut = useMutation({
    mutationFn: downloadDataExport,
    onSuccess: () => {
      setExportedAt(Date.now());
      setTimeout(() => setExportedAt(null), 4000);
    },
  });

  const deleteMut = useMutation({
    mutationFn: scheduleAccountDeletion,
    onSuccess: (res) => {
      // Atualiza o estado local pra mostrar o banner de cancelamento sem precisar relogar.
      if (user && token) {
        setAuth(token, { ...user, scheduledDeletionAt: res.scheduledDeletionAt });
      }
      setConfirmDelete(false);
      setConfirmText('');
    },
  });

  const cancelMut = useMutation({
    mutationFn: cancelAccountDeletion,
    onSuccess: () => {
      if (user && token) {
        setAuth(token, { ...user, scheduledDeletionAt: null });
      }
    },
  });

  const canConfirmDelete = confirmText === 'EXCLUIR';

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
          Meus dados (LGPD)
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Direitos garantidos pela Lei Geral de Proteção de Dados (LGPD).
        </p>
      </header>

      {/* Banner de exclusão pendente — janela de retratação */}
      {pendingDeletion && (
        <div
          className="rounded-xl px-5 py-4 flex items-start gap-3"
          style={{
            background: 'rgba(229,72,77,0.06)',
            border: '1px solid rgba(229,72,77,0.35)',
          }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} strokeWidth={2} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
              Sua conta está marcada para exclusão
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              Os dados serão apagados definitivamente em{' '}
              <strong>{formatDate(pendingDeletion)}</strong>. Cancele agora se mudou de ideia —
              após essa data não há como recuperar.
            </p>
            <button
              onClick={() => cancelMut.mutate()}
              disabled={cancelMut.isPending}
              className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--danger)' }}
            >
              {cancelMut.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cancelando…
                </>
              ) : (
                <>
                  <Undo2 className="w-3.5 h-3.5" strokeWidth={2} /> Cancelar exclusão
                </>
              )}
            </button>
            {cancelMut.isError && (
              <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>
                Erro ao cancelar. Tente novamente.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Export */}
      <section
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: 12, padding: 20 }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--brand-50)' }}
          >
            <Download className="w-5 h-5" style={{ color: 'var(--brand-500)' }} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
              Baixar meus dados
            </h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              Exporta um arquivo JSON com todos os seus dados pessoais, workspace, contatos, empresas,
              negócios e produtos. Direito de portabilidade — LGPD art. 18, II.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => exportMut.mutate()}
                disabled={exportMut.isPending}
                className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)' }}
              >
                {exportMut.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Preparando…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" strokeWidth={2} /> Baixar JSON
                  </>
                )}
              </button>
              {exportedAt && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--success, #0E7C3A)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Download iniciado
                </span>
              )}
              {exportMut.isError && (
                <span className="text-xs" style={{ color: 'var(--danger)' }}>
                  Erro ao gerar export.
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Delete — escondido enquanto há exclusão pendente */}
      {!pendingDeletion && (
      <section className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(229,72,77,0.35)' }}>
        <div className="px-5 py-4 flex items-start gap-4" style={{ background: 'rgba(229,72,77,0.04)' }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(229,72,77,0.1)' }}
          >
            <Trash2 className="w-5 h-5" style={{ color: 'var(--danger)' }} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
              Excluir minha conta
            </h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              Sua conta será marcada para exclusão. Você terá <strong>30 dias</strong> para mudar de ideia —
              durante esse período o login fica bloqueado mas a reativação é possível pelo link de cancelamento.
              Após 30 dias, todos os seus dados são apagados definitivamente. LGPD art. 18, V.
            </p>
            <button
              onClick={() => {
                setConfirmText('');
                setConfirmDelete(true);
              }}
              className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                border: '1px solid rgba(229,72,77,0.25)',
              }}
            >
              <Trash2 className="w-4 h-4" strokeWidth={2} />
              Excluir minha conta
            </button>
          </div>
        </div>
      </section>
      )}

      {/* Modal de confirmação */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => !deleteMut.isPending && setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-md"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--edge-strong)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--edge)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(229,72,77,0.1)' }}
                >
                  <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} strokeWidth={2} />
                </div>
                <h3 className="text-[15px] font-semibold" style={{ color: 'var(--ink-1)' }}>
                  Confirmar exclusão da conta
                </h3>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div
                className="rounded-lg px-4 py-3 space-y-1.5"
                style={{ background: 'rgba(229,72,77,0.06)', border: '1px solid rgba(229,72,77,0.2)' }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                  Conta marcada para exclusão (30 dias de carência)
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  Após confirmar:
                </p>
                <ul className="text-xs space-y-0.5 ml-3" style={{ color: 'var(--ink-3)' }}>
                  <li>• Você será deslogado imediatamente</li>
                  <li>• Login bloqueado durante os 30 dias</li>
                  <li>• Em até 30d, dá pra cancelar a exclusão pelo suporte</li>
                  <li>• Após 30d, todos os dados são apagados definitivamente</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
                  Para confirmar, digite{' '}
                  <strong style={{ color: 'var(--danger)', fontFamily: 'monospace' }}>EXCLUIR</strong>:
                </label>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  autoFocus
                  className="input-base font-mono tracking-widest"
                  style={{ fontSize: 14 }}
                  onPaste={(e) => e.preventDefault()}
                />
              </div>

              {deleteMut.isError && (
                <p
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
                >
                  {(deleteMut.error as any)?.response?.data?.message || 'Erro ao agendar exclusão. Tente novamente.'}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleteMut.isPending}
                  className="flex-1 h-9 rounded-lg text-sm font-medium"
                  style={{
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--edge)',
                    color: 'var(--ink-2)',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteMut.mutate()}
                  disabled={!canConfirmDelete || deleteMut.isPending}
                  className="flex-1 h-9 rounded-lg text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: canConfirmDelete ? 'var(--danger)' : 'rgba(229,72,77,0.4)' }}
                >
                  {deleteMut.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processando…
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" strokeWidth={2} /> Confirmar exclusão
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}
