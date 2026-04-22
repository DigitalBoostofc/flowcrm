import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import { listPipelines } from '@/api/pipelines';
import { listUsers } from '@/api/users';
import { useWorkspace } from '@/hooks/useWorkspace';
import {
  Copy, Check, ExternalLink, MessageCircle, ToggleLeft, ToggleRight, ChevronDown,
  Phone, Headphones, Smile, Zap, Send,
} from 'lucide-react';

interface WidgetConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  formBg: string;
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
  color: '#25D366',
  icon: 'whatsapp',
  formBg: '#ffffff',
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

/* ── WhatsApp SVG icon ── */
function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function WidgetIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  const props = { size };
  if (icon === 'whatsapp')    return <WhatsAppIcon size={size} />;
  if (icon === 'phone')       return <Phone {...props} />;
  if (icon === 'headphones')  return <Headphones {...props} />;
  if (icon === 'smile')       return <Smile {...props} />;
  if (icon === 'zap')         return <Zap {...props} />;
  return <MessageCircle {...props} />;
}

const ICON_OPTIONS = [
  { id: 'whatsapp',    label: 'WhatsApp' },
  { id: 'chat',        label: 'Chat' },
  { id: 'phone',       label: 'Telefone' },
  { id: 'headphones',  label: 'Suporte' },
  { id: 'smile',       label: 'Atendimento' },
  { id: 'zap',         label: 'Rápido' },
];

/* ── Custom Select ── */
interface SelectOption { value: string; label: string }

function StyledSelect({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', height: 36, padding: '0 12px', borderRadius: 8,
          fontSize: 13.5, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          background: 'var(--surface)', border: '1px solid',
          borderColor: open ? 'var(--brand-500)' : 'var(--edge-strong)',
          color: selected ? 'var(--ink-1)' : 'var(--ink-3)',
          cursor: 'pointer', outline: 'none',
          boxShadow: open ? '0 0 0 3px rgba(99,91,255,0.15)' : undefined,
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? placeholder ?? ''}
        </span>
        <ChevronDown style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--ink-3)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--surface-raised)', border: '1px solid var(--edge-strong)',
          borderRadius: 8, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: 220, overflowY: 'auto',
        }}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={() => { onChange(opt.value); setOpen(false); }}
              style={{
                width: '100%', padding: '7px 12px', textAlign: 'left',
                fontSize: 13.5, fontFamily: 'inherit',
                background: opt.value === value ? 'var(--brand-50)' : 'transparent',
                color: opt.value === value ? 'var(--brand-500)' : 'var(--ink-1)',
                border: 'none', cursor: 'pointer', display: 'block', transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'; }}
              onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Form preview (static mockup, always light) ── */
function FormPreview({ cfg }: { cfg: WidgetConfig }) {
  const primary = cfg.color || '#6366f1';
  const formBg = cfg.formBg || '#ffffff';
  return (
    <div style={{
      background: formBg, borderRadius: 16,
      boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
      overflow: 'hidden', width: '100%',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#111',
    }}>
      <div style={{ padding: '14px 18px', background: primary, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
        <WidgetIcon icon={cfg.icon || 'chat'} size={18} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{cfg.title || 'Fale conosco'}</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>{cfg.subtitle || 'Responderemos no WhatsApp'}</div>
        </div>
      </div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { label: 'Nome *', ph: 'Seu nome' },
          { label: 'WhatsApp *', ph: '(11) 99999-9999' },
          ...(cfg.collectEmail ? [{ label: 'E-mail', ph: 'email@exemplo.com' }] : []),
          { label: 'Mensagem', ph: 'Como podemos ajudar?', tall: true },
        ].map(({ label, ph, tall }) => (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#4b5563', marginBottom: 4 }}>{label}</div>
            <div style={{
              border: '1px solid #e5e7eb', borderRadius: 7,
              padding: tall ? '8px 10px' : '0 10px',
              height: tall ? 46 : 32,
              background: '#f9fafb', color: '#9ca3af',
              fontSize: 12, display: 'flex', alignItems: tall ? 'flex-start' : 'center',
            }}>
              {ph}
            </div>
          </div>
        ))}
        <div style={{
          borderRadius: 9, background: primary, color: '#fff',
          padding: '9px 0', textAlign: 'center',
          fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Send size={13} /> Enviar mensagem
        </div>
      </div>
    </div>
  );
}

export default function WidgetTab() {
  const { data: workspace } = useWorkspace();
  const [cfg, setCfg] = useState<WidgetConfig>(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<'button' | 'form'>('button');

  const { data: savedConfig } = useQuery({ queryKey: ['widget-config'], queryFn: getWidgetConfig });
  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const salePipelines = pipelines.filter(p => p.kind === 'sale');
  const { data: stages = [] } = useQuery({
    queryKey: ['stages', cfg.pipelineId],
    queryFn: () => cfg.pipelineId ? listStages(cfg.pipelineId) : Promise.resolve([]),
    enabled: !!cfg.pipelineId,
  });

  useEffect(() => {
    if (savedConfig) setCfg(savedConfig);
  }, [savedConfig]);

  useEffect(() => {
    if (salePipelines.length > 0 && !cfg.pipelineId) {
      set('pipelineId', salePipelines[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salePipelines.length]);

  const saveMutation = useMutation({
    mutationFn: saveWidgetConfig,
    onSuccess: (data) => setCfg(data),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Erro ao salvar'),
  });

  const workspaceId = workspace?.id ?? '';
  const widgetUrl = `${window.location.origin}/widget/${workspaceId}`;
  const embedCode = `<iframe\n  src="${widgetUrl}"\n  style="position:fixed;bottom:20px;right:20px;width:380px;height:520px;border:none;z-index:9999;"\n  title="Widget AppexCRM"\n></iframe>`;

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

  const activeUsers = users.filter(u => (u as any).active !== false);
  const pipelineOptions: SelectOption[] = salePipelines.map(p => ({ value: p.id, label: p.name }));
  const stageOptions: SelectOption[] = [{ value: '', label: 'Primeira etapa' }, ...stages.map(s => ({ value: s.id, label: s.name }))];
  const userOptions: SelectOption[] = [{ value: '', label: 'Sem atribuição' }, ...activeUsers.map(u => ({ value: u.id, label: u.name }))];

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
          style={{
            padding: '6px 12px', borderRadius: 8, border: '1px solid',
            borderColor: cfg.enabled ? 'var(--brand-500)' : 'var(--edge-strong)',
            background: cfg.enabled ? 'var(--brand-50)' : 'var(--surface)',
            color: cfg.enabled ? 'var(--brand-500)' : 'var(--ink-2)',
          }}
        >
          {cfg.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          {cfg.enabled ? 'Widget ativo' : 'Widget inativo'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Config ── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Aparência</h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Título do botão</label>
            <input value={cfg.title} onChange={e => set('title', e.target.value)} className="input-base" placeholder="Fale conosco" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Subtítulo</label>
            <input value={cfg.subtitle} onChange={e => set('subtitle', e.target.value)} className="input-base" placeholder="Responderemos no WhatsApp" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Cor principal</label>
            <div className="flex items-center gap-3">
              <input
                type="color" value={cfg.color} onChange={e => set('color', e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer"
                style={{ border: '1px solid var(--edge)' }}
              />
              <input value={cfg.color} onChange={e => set('color', e.target.value)} className="input-base flex-1" placeholder="#25D366" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Cor de fundo do formulário</label>
            <div className="flex items-center gap-3">
              <input
                type="color" value={cfg.formBg || '#ffffff'} onChange={e => set('formBg', e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer"
                style={{ border: '1px solid var(--edge)' }}
              />
              <input value={cfg.formBg || '#ffffff'} onChange={e => set('formBg', e.target.value)} className="input-base flex-1" placeholder="#ffffff" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Ícone do botão</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ICON_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  title={label}
                  onClick={() => set('icon', id)}
                  style={{
                    width: 44, height: 44, borderRadius: 8,
                    border: '1px solid',
                    borderColor: cfg.icon === id ? 'var(--brand-500)' : 'var(--edge-strong)',
                    background: cfg.icon === id ? 'var(--brand-50)' : 'var(--surface)',
                    color: cfg.icon === id ? 'var(--brand-500)' : 'var(--ink-2)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.12s',
                  }}
                >
                  <WidgetIcon icon={id} size={18} />
                </button>
              ))}
            </div>
            <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
              {ICON_OPTIONS.find(o => o.id === (cfg.icon || 'chat'))?.label ?? 'Chat'}
            </p>
          </div>

          <div className="flex items-center gap-3 py-1">
            <button
              onClick={() => set('collectEmail', !cfg.collectEmail)}
              className="flex items-center gap-2 text-sm"
              style={{ color: cfg.collectEmail ? 'var(--brand-500)' : 'var(--ink-3)' }}
            >
              {cfg.collectEmail ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              Coletar e-mail
            </button>
          </div>

          <h3 className="text-sm font-semibold pt-2" style={{ color: 'var(--ink-2)' }}>CRM</h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>WhatsApp para redirecionamento</label>
            <input value={cfg.whatsappNumber} onChange={e => set('whatsappNumber', e.target.value)} className="input-base" placeholder="5511999999999" />
            <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Código do país + DDD + número, sem espaços ou símbolos.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Funil de destino</label>
            <StyledSelect value={cfg.pipelineId ?? ''} onChange={v => set('pipelineId', v || null)} options={pipelineOptions} placeholder="Selecione um funil" />
          </div>

          {cfg.pipelineId && stages.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Etapa de entrada</label>
              <StyledSelect value={cfg.stageId ?? ''} onChange={v => set('stageId', v || null)} options={stageOptions} placeholder="Primeira etapa" />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Atribuir leads para</label>
            <StyledSelect value={cfg.assignToId ?? ''} onChange={v => set('assignToId', v || null)} options={userOptions} placeholder="Sem atribuição" />
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={() => saveMutation.mutate(cfg)} disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Salvando...' : 'Salvar configurações'}
            </button>
          </div>
        </div>

        {/* ── Preview + embed ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Preview</h3>
            <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: 6, padding: 2 }}>
              {(['button', 'form'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  style={{
                    padding: '3px 10px', borderRadius: 4, fontSize: 12, fontFamily: 'inherit',
                    border: 'none', cursor: 'pointer', transition: 'all 0.12s',
                    background: previewMode === mode ? 'var(--surface-raised)' : 'transparent',
                    color: previewMode === mode ? 'var(--ink-1)' : 'var(--ink-3)',
                    fontWeight: previewMode === mode ? 500 : 400,
                    boxShadow: previewMode === mode ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {mode === 'button' ? 'Botão' : 'Formulário'}
                </button>
              ))}
            </div>
          </div>

          {previewMode === 'button' ? (
            <div
              className="rounded-xl flex items-end justify-end p-4"
              style={{
                background: 'var(--surface)', border: '1px solid var(--edge)', minHeight: 200,
                backgroundImage: 'radial-gradient(var(--edge) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            >
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white font-medium text-sm"
                style={{ background: cfg.color }}
              >
                <WidgetIcon icon={cfg.icon || 'chat'} size={18} />
                {cfg.title || 'Fale conosco'}
              </div>
            </div>
          ) : (
            <FormPreview cfg={cfg} />
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Código de incorporação</h3>
              <a href={widgetUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs" style={{ color: 'var(--brand-500)' }}>
                <ExternalLink className="w-3.5 h-3.5" /> Abrir widget
              </a>
            </div>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Cole este código antes do{' '}
              <code className="text-[11px] px-1 rounded" style={{ background: 'var(--surface-hover)' }}>&lt;/body&gt;</code>{' '}
              do seu site.
            </p>
            <div
              className="relative rounded-lg p-3 font-mono text-xs overflow-x-auto"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
            >
              <pre className="whitespace-pre-wrap break-all">{embedCode}</pre>
              <button
                onClick={copyEmbed}
                className="absolute top-2 right-2 p-1.5 rounded-md transition-colors"
                style={{ background: 'var(--surface-hover)', color: copied ? 'var(--brand-500)' : 'var(--ink-3)' }}
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
