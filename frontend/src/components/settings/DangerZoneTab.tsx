import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

async function deleteAccount(): Promise<void> {
  await api.delete('/workspace/me');
}

export default function DangerZoneTab() {
  const logout = useAuthStore(s => s.logout);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const deleteMut = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      logout();
      window.location.href = '/login';
    },
  });

  const canConfirm = confirmText === 'DELETAR';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">Zona de perigo</h2>
        <p className="page-subtitle">Ações irreversíveis que afetam permanentemente sua conta.</p>
      </div>

      {/* Delete account card */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(229,72,77,0.35)' }}
      >
        <div className="px-5 py-4 flex items-start gap-4" style={{ background: 'rgba(229,72,77,0.04)' }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'rgba(229,72,77,0.1)' }}
          >
            <Trash2 className="w-5 h-5" style={{ color: 'var(--danger)' }} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
              Excluir conta e todos os dados
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              Remove permanentemente este workspace, todos os usuários, contatos, negócios,
              conversas, mensagens e configurações. <strong style={{ color: 'var(--danger)' }}>Não há como recuperar os dados após esta ação.</strong>
            </p>
          </div>
          <button
            onClick={() => { setConfirmText(''); setModalOpen(true); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium flex-shrink-0"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(229,72,77,0.25)' }}
          >
            <Trash2 className="w-4 h-4" strokeWidth={2} />
            Excluir conta
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => !deleteMut.isPending && setModalOpen(false)}
        >
          <div
            className="w-full max-w-md animate-fade-up"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--edge-strong)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--edge)' }}>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(229,72,77,0.1)' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} strokeWidth={2} />
                </div>
                <h2 className="text-[15px] font-semibold" style={{ color: 'var(--ink-1)' }}>
                  Confirmar exclusão da conta
                </h2>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">
              {/* Warning box */}
              <div
                className="rounded-lg px-4 py-3 space-y-1.5"
                style={{ background: 'rgba(229,72,77,0.06)', border: '1px solid rgba(229,72,77,0.2)' }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                  ⚠ Esta ação é permanente e irreversível
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  Ao confirmar, serão deletados <strong>permanentemente</strong>:
                </p>
                <ul className="text-xs space-y-0.5 ml-3" style={{ color: 'var(--ink-3)' }}>
                  <li>• Todos os usuários e credenciais de acesso</li>
                  <li>• Todos os contatos, empresas e negócios</li>
                  <li>• Todo o histórico de conversas e mensagens</li>
                  <li>• Todas as configurações, funis e automações</li>
                  <li>• Integrações (WhatsApp, Google Calendar)</li>
                </ul>
                <p className="text-xs font-semibold mt-2" style={{ color: 'var(--danger)' }}>
                  Não será possível recuperar nenhum dado após a exclusão.
                </p>
              </div>

              {/* Confirmation input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
                  Para confirmar, digite <strong style={{ color: 'var(--danger)', fontFamily: 'monospace' }}>DELETAR</strong> no campo abaixo:
                </label>
                <input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="DELETAR"
                  autoFocus
                  className="input-base font-mono tracking-widest"
                  style={{ fontSize: 14 }}
                  onPaste={e => e.preventDefault()}
                />
              </div>

              {deleteMut.isError && (
                <p className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                  Erro ao excluir conta. Tente novamente.
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setModalOpen(false)}
                  disabled={deleteMut.isPending}
                  className="flex-1 h-9 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteMut.mutate()}
                  disabled={!canConfirm || deleteMut.isPending}
                  className="flex-1 h-9 rounded-lg text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: canConfirm ? 'var(--danger)' : 'rgba(229,72,77,0.4)' }}
                >
                  {deleteMut.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Deletando...</>
                    : <><Trash2 className="w-4 h-4" strokeWidth={2} /> Excluir permanentemente</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
