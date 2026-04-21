import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import { listPipelines } from '@/api/pipelines';
import { listUsers } from '@/api/users';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Copy, Check, ExternalLink, MessageCircle, ToggleLeft, ToggleRight } from 'lucide-react';

interface WidgetConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  color: string;
  pipelineId: string | null;
  stageId: string | null;
  assignToId: string | null;
  whatsappNumber: string;
  collectEmail: boolean;
}

const DEFAULTS: WidgetConfig = {
  enabled: false,
  title: 'Fale conosco',
  subtitle: 'Responderemos no WhatsApp',
  color: '#6366f1',
  pipelineId: null,
  stageId: null,
  assignToId: null,
  whatsappNumber: '',
  collectEmail: false,
};

async function getWidgetConfig(): Promise<WidgetConfig | null> {
  const res = await api.get('/workspaces/widget-config');
  return res.data;
}

async function saveWidgetConfig(config: WidgetConfig): Promise<WidgetConfig> {
  const res = await api.patch('/workspaces/widget-config', config);
  return res.data;
}

async function listStages(pipelineId: string) {
  const res = await api.get(`/pipelines/${pipelineId}`);
  return (res.data?.stages ?? []) as { id: string; name: string; position: number }[];
}

export default function WidgetTab() {
  const { data: workspace } = useWorkspace();
  const [cfg, setCfg] = useState<WidgetConfig>(DEFAULTS);
  const [copied, setCopied] = useState(false);

  const { data: savedConfig } = useQuery({ queryKey: ['widget-config'], queryFn: getWidgetConfig });
  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const { data: stages = [] } = useQuery({
    queryKey: ['stages', cfg.pipelineId],
    queryFn: () => cfg.pipelineId ? listStages(cfg.pipelineId) : Promise.resolve([]),
    enabled: !!cfg.pipelineId,
  });

  useEffect(() => {
    if (savedConfig) setCfg(savedConfig);
  }, [savedConfig]);

  const saveMutation = useMutation({
    mutationFn: saveWidgetConfig,
    onSuccess: (data) => setCfg(data),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Erro ao salvar'),
  });

  const workspaceId = workspace?.id ?? '';
  const widgetUrl = `${window.location.origin}/widget/${workspaceId}`;
  const embedCode = `<iframe\n  src="${widgetUrl}"\n  style="position:fixed;bottom:20px;right:20px;width:380px;height:520px;border:none;z-index:9999;"\n  title="Widget FlowCRM"\n></iframe>`;

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function set<K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) {
    setCfg(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'pipelineId' ? { stageId: null } : {}),
    }));
  }

  const activeUsers = users.filter(u => (u as any).active !== false && u.role !== 'owner');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="page-title">Widget WhatsApp</h2>
          <p className="page-subtitle">Captura leads do seu site e cria negócios automaticamente no CRM.</p>
        </div>
        <button
          onClick={() => set('enabled', !cfg.enabled)}
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: cfg.enabled ? 'var(--accent)' : 'var(--ink-3)' }}
        >
          {cfg.enabled
            ? <ToggleRight className="w-6 h-6" />
            : <ToggleLeft className="w-6 h-6" />}
          {cfg.enabled ? 'Ativo' : 'Inativo'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Config panel */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Aparência</h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Título do botão</label>
            <input
              value={cfg.title}
              onChange={e => set('title', e.target.value)}
              className="input-base"
              placeholder="Fale conosco"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Subtítulo</label>
            <input
              value={cfg.subtitle}
              onChange={e => set('subtitle', e.target.value)}
              className="input-base"
              placeholder="Responderemos no WhatsApp"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Cor principal</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={cfg.color}
                onChange={e => set('color', e.target.value)}
                className="w-10 h-10 rounded-lg border cursor-pointer"
                style={{ border: '1px solid var(--edge)' }}
              />
              <input
                value={cfg.color}
                onChange={e => set('color', e.target.value)}
                className="input-base flex-1"
                placeholder="#6366f1"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <button
              onClick={() => set('collectEmail', !cfg.collectEmail)}
              className="flex items-center gap-2 text-sm"
              style={{ color: cfg.collectEmail ? 'var(--accent)' : 'var(--ink-3)' }}
            >
              {cfg.collectEmail ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              Coletar e-mail
            </button>
          </div>

          <h3 className="text-sm font-semibold pt-2" style={{ color: 'var(--ink-2)' }}>CRM</h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>WhatsApp para redirecionamento</label>
            <input
              value={cfg.whatsappNumber}
              onChange={e => set('whatsappNumber', e.target.value)}
              className="input-base"
              placeholder="5511999999999"
            />
            <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Código do país + DDD + número, sem espaços ou símbolos.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Funil de destino</label>
            <select
              value={cfg.pipelineId ?? ''}
              onChange={e => set('pipelineId', e.target.value || null)}
              className="input-base"
            >
              <option value="">Padrão do workspace</option>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {cfg.pipelineId && stages.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Etapa de entrada</label>
              <select
                value={cfg.stageId ?? ''}
                onChange={e => set('stageId', e.target.value || null)}
                className="input-base"
              >
                <option value="">Primeira etapa</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Atribuir leads para</label>
            <select
              value={cfg.assignToId ?? ''}
              onChange={e => set('assignToId', e.target.value || null)}
              className="input-base"
            >
              <option value="">Sem atribuição</option>
              {activeUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => saveMutation.mutate(cfg)}
              disabled={saveMutation.isPending}
              className="btn-primary"
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar configurações'}
            </button>
          </div>
        </div>

        {/* Preview + embed */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Preview</h3>

          <div
            className="rounded-xl flex items-end justify-end p-4"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--edge)',
              minHeight: 200,
              backgroundImage: 'radial-gradient(var(--edge) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white font-medium text-sm"
              style={{ background: cfg.color }}
            >
              <MessageCircle className="w-5 h-5" />
              {cfg.title || 'Fale conosco'}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Código de incorporação</h3>
              <a
                href={widgetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--accent)' }}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir widget
              </a>
            </div>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Cole este código antes do <code className="text-[11px] px-1 rounded" style={{ background: 'var(--surface-hover)' }}>&lt;/body&gt;</code> do seu site.
            </p>
            <div
              className="relative rounded-lg p-3 font-mono text-xs overflow-x-auto"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
            >
              <pre className="whitespace-pre-wrap break-all">{embedCode}</pre>
              <button
                onClick={copyEmbed}
                className="absolute top-2 right-2 p-1.5 rounded-md transition-colors"
                style={{ background: 'var(--surface-hover)', color: copied ? 'var(--accent)' : 'var(--ink-3)' }}
                title="Copiar"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
