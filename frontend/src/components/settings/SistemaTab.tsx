import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getAppSettings, updateAppSettings } from '@/api/signup';
import { listChannels } from '@/api/channels';

export default function SistemaTab() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ['app-settings'], queryFn: getAppSettings });
  const { data: channels } = useQuery({ queryKey: ['channels'], queryFn: listChannels });

  const [systemChannelConfigId, setSystemChannelConfigId] = useState<string>('');
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [trialDays, setTrialDays] = useState(7);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (settings) {
      setSystemChannelConfigId(settings.systemChannelConfigId ?? '');
      setSignupEnabled(settings.signupEnabled);
      setTrialDays(settings.trialDays);
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: () =>
      updateAppSettings({
        systemChannelConfigId: systemChannelConfigId || null,
        signupEnabled,
        trialDays,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-settings'] });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-3)' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
      </div>
    );
  }

  const connectedWhatsApp = (channels ?? []).filter((c) => (c.type === 'evolution' || c.type === 'uazapi') && c.active);
  const noChannels = connectedWhatsApp.length === 0;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
          Sistema
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Configurações globais do SaaS — canal de OTP, cadastro público e período de trial.
        </p>
      </header>

      {/* Canal do sistema */}
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--edge)',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div className="mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Canal WhatsApp do sistema</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
            Usado para enviar códigos OTP no cadastro público. Precisa ser um canal WhatsApp ativo.
          </p>
        </div>

        {noChannels ? (
          <div
            className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg"
            style={{ background: 'var(--warning-bg, rgba(255,176,32,0.1))', color: 'var(--warning, #B45309)' }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Nenhum canal WhatsApp ativo. Crie um canal em <b>Canais WhatsApp</b> antes de ativar o cadastro público.</span>
          </div>
        ) : (
          <select
            className="input-base w-full"
            value={systemChannelConfigId}
            onChange={(e) => setSystemChannelConfigId(e.target.value)}
          >
            <option value="">— Nenhum canal selecionado —</option>
            {connectedWhatsApp.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type}) — {c.status === 'connected' ? '🟢 conectado' : '🟡 ' + c.status}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Cadastro público */}
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--edge)',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Cadastro público (/signup)</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
              Quando desativado, apenas usuários convidados conseguem criar conta.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={signupEnabled}
              onChange={(e) => setSignupEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[var(--accent)] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>
      </section>

      {/* Trial */}
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--edge)',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Dias de trial</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
              Período gratuito padrão para novos workspaces.
            </p>
          </div>
          <input
            type="number"
            min={1}
            max={365}
            value={trialDays}
            onChange={(e) => setTrialDays(Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 1)))}
            className="input-base w-20 text-center"
          />
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
