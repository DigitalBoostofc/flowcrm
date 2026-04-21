import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Globe, Lock } from 'lucide-react';
import { getMyWorkspace, updateWorkspaceSettings } from '@/api/workspace';

export default function PrivacidadeTab() {
  const qc = useQueryClient();
  const { data: workspace } = useQuery({ queryKey: ['workspace-me'], queryFn: getMyWorkspace });

  const [defaultPrivacy, setDefaultPrivacy] = useState<'all' | 'restricted'>('all');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (workspace) setDefaultPrivacy(workspace.defaultLeadPrivacy ?? 'all');
  }, [workspace]);

  const saveMut = useMutation({
    mutationFn: () => updateWorkspaceSettings({ defaultLeadPrivacy: defaultPrivacy }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-me'] });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
          Privacidade
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Controle quem pode visualizar negócios criados no workspace.
        </p>
      </header>

      <section style={{ background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: 12, padding: 20 }}>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--ink-1)' }}>Visibilidade padrão de negócios</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-3)' }}>
          Define como novos negócios são criados. Pode ser alterado por negócio individualmente.
        </p>

        <div className="space-y-3">
          <label
            className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors"
            style={{
              border: `1px solid ${defaultPrivacy === 'all' ? 'var(--brand-500, #6366f1)' : 'var(--edge)'}`,
              background: defaultPrivacy === 'all' ? 'rgba(99,102,241,0.06)' : 'var(--surface)',
            }}
          >
            <input
              type="radio"
              name="defaultPrivacy"
              checked={defaultPrivacy === 'all'}
              onChange={() => setDefaultPrivacy('all')}
              className="sr-only"
            />
            <div className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                border: `2px solid ${defaultPrivacy === 'all' ? 'var(--brand-500, #6366f1)' : 'var(--edge-strong, var(--edge))'}`,
                background: defaultPrivacy === 'all' ? 'var(--brand-500, #6366f1)' : 'transparent',
              }}
            >
              {defaultPrivacy === 'all' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--ink-1)' }}>
                <Globe className="w-4 h-4" /> Todos do workspace
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                Qualquer membro da equipe pode ver todos os negócios.
              </p>
            </div>
          </label>

          <label
            className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors"
            style={{
              border: `1px solid ${defaultPrivacy === 'restricted' ? 'var(--brand-500, #6366f1)' : 'var(--edge)'}`,
              background: defaultPrivacy === 'restricted' ? 'rgba(99,102,241,0.06)' : 'var(--surface)',
            }}
          >
            <input
              type="radio"
              name="defaultPrivacy"
              checked={defaultPrivacy === 'restricted'}
              onChange={() => setDefaultPrivacy('restricted')}
              className="sr-only"
            />
            <div className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                border: `2px solid ${defaultPrivacy === 'restricted' ? 'var(--brand-500, #6366f1)' : 'var(--edge-strong, var(--edge))'}`,
                background: defaultPrivacy === 'restricted' ? 'var(--brand-500, #6366f1)' : 'transparent',
              }}
            >
              {defaultPrivacy === 'restricted' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--ink-1)' }}>
                <Lock className="w-4 h-4" /> Restrito
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                Apenas o criador, o responsável e usuários explicitamente liberados podem ver o negócio.
                Gerentes e proprietários sempre têm acesso total.
              </p>
            </div>
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="h-9 px-4 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
            boxShadow: '0 1px 3px rgba(99,91,255,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {saveMut.isPending ? 'Salvando…' : 'Salvar'}
        </button>
        {savedAt && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--success, #0E7C3A)' }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Salvo
          </span>
        )}
        {saveMut.isError && (
          <span className="text-xs" style={{ color: 'var(--danger)' }}>
            {(saveMut.error as any)?.response?.data?.message || 'Erro ao salvar'}
          </span>
        )}
      </div>
    </div>
  );
}
