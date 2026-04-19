import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, Clock, Filter, MessageCircle, ChevronLeft } from 'lucide-react';
import type {
  AutomationStep, AutomationStepType, WaitStepConfig, FilterStepConfig,
  SendWhatsappStepConfig, FilterCondition,
} from '@/api/automations';
import { listChannels } from '@/api/channels';
import { listTemplates, createTemplate } from '@/api/templates';
import { FILTER_CATALOG, OPERATORS, findFieldDef } from '@/lib/automation-filter-catalog';

interface Props {
  open: boolean;
  initial: AutomationStep | null;
  onClose: () => void;
  onSave: (step: AutomationStep) => void;
}

type View = 'choose-type' | 'edit';

export default function StepConfigDrawer({ open, initial, onClose, onSave }: Props) {
  const [view, setView] = useState<View>('choose-type');
  const [type, setType] = useState<AutomationStepType>('wait');
  const [config, setConfig] = useState<AutomationStep['config']>({});

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setView('edit');
      setType(initial.type);
      setConfig(initial.config);
    } else {
      setView('choose-type');
      setType('wait');
      setConfig({});
    }
  }, [open, initial]);

  const pickType = (t: AutomationStepType) => {
    setType(t);
    if (t === 'wait') setConfig({ amount: 1, unit: 'hours' } as WaitStepConfig);
    if (t === 'filter') setConfig({ logic: 'and', conditions: [] } as FilterStepConfig);
    if (t === 'send_whatsapp') setConfig({ channelId: '', templateId: '' } as SendWhatsappStepConfig);
    setView('edit');
  };

  const handleSave = () => {
    onSave({
      id: initial?.id,
      position: initial?.position ?? 0,
      type,
      config,
    });
  };

  const title = initial
    ? 'Editar passo'
    : view === 'choose-type' ? 'Adicionar passo' : 'Novo passo';

  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: open ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
          backdropFilter: open ? 'blur(2px)' : 'none',
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 h-full z-50 shadow-2xl transition-transform duration-300 ease-out flex flex-col"
        style={{
          width: 'min(520px, 100vw)',
          background: 'var(--surface-raised, #fff)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          borderLeft: '1px solid var(--edge)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--edge)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {view === 'edit' && !initial && (
              <button
                onClick={() => setView('choose-type')}
                className="p-1 rounded-md hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--ink-3)' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-base font-bold" style={{ color: 'var(--ink-1)' }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-3)' }}
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {view === 'choose-type' ? (
            <TypePicker onPick={pickType} />
          ) : type === 'wait' ? (
            <WaitEditor config={config as WaitStepConfig} onChange={setConfig} />
          ) : type === 'filter' ? (
            <FilterEditor config={config as FilterStepConfig} onChange={setConfig} />
          ) : (
            <SendWhatsappEditor config={config as SendWhatsappStepConfig} onChange={setConfig} />
          )}
        </div>

        {view === 'edit' && (
          <div
            className="flex items-center justify-end gap-2 px-5 py-3"
            style={{ borderTop: '1px solid var(--edge)', background: 'var(--surface)' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-2)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-md text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
              style={{ background: 'var(--brand-500, #6366f1)' }}
            >
              Salvar passo
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function TypePicker({ onPick }: { onPick: (t: AutomationStepType) => void }) {
  const options: { type: AutomationStepType; icon: typeof Clock; title: string; desc: string }[] = [
    { type: 'wait', icon: Clock, title: 'Tempo de espera', desc: 'Aguardar antes de continuar o fluxo.' },
    { type: 'filter', icon: Filter, title: 'Filtro', desc: 'Só continuar se as condições forem atendidas.' },
    { type: 'send_whatsapp', icon: MessageCircle, title: 'Enviar WhatsApp', desc: 'Disparar mensagem via template.' },
  ];
  return (
    <div className="space-y-2">
      <p className="text-xs mb-3" style={{ color: 'var(--ink-3)' }}>
        Escolha o tipo de passo que deseja adicionar ao fluxo.
      </p>
      {options.map(({ type, icon: Icon, title, desc }) => (
        <button
          key={type}
          onClick={() => onPick(type)}
          className="w-full flex items-start gap-3 p-4 rounded-lg text-left transition-colors hover:bg-[var(--surface-hover)]"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
        >
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--brand-500, #6366f1)' }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>{title}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function WaitEditor({
  config,
  onChange,
}: {
  config: WaitStepConfig;
  onChange: (c: WaitStepConfig) => void;
}) {
  return (
    <div>
      <p className="text-xs mb-4" style={{ color: 'var(--ink-2)' }}>
        O fluxo vai pausar pelo tempo definido antes de executar o próximo passo.
      </p>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-1)' }}>
            Quantidade
          </label>
          <input
            type="number"
            min={0}
            value={config.amount ?? 0}
            onChange={(e) => onChange({ ...config, amount: Math.max(0, parseInt(e.target.value || '0', 10)) })}
            className="w-full px-3 py-2.5 rounded-md text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-1)' }}>
            Unidade
          </label>
          <select
            value={config.unit ?? 'hours'}
            onChange={(e) => onChange({ ...config, unit: e.target.value as WaitStepConfig['unit'] })}
            className="w-full px-3 py-2.5 rounded-md text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
          >
            <option value="minutes">Minutos</option>
            <option value="hours">Horas</option>
            <option value="days">Dias</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function FilterEditor({
  config,
  onChange,
}: {
  config: FilterStepConfig;
  onChange: (c: FilterStepConfig) => void;
}) {
  const conditions = config.conditions ?? [];

  const update = (i: number, patch: Partial<FilterCondition>) => {
    const next = conditions.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ ...config, conditions: next });
  };

  const remove = (i: number) => {
    onChange({ ...config, conditions: conditions.filter((_, idx) => idx !== i) });
  };

  const add = () => {
    onChange({
      ...config,
      conditions: [...conditions, { target: 'lead', field: 'title', operator: 'eq', value: '' }],
    });
  };

  return (
    <div>
      <p className="text-xs mb-4" style={{ color: 'var(--ink-2)' }}>
        O fluxo só continua se as condições forem verdadeiras. Se falhar, a automação para.
      </p>

      <div className="mb-4">
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-1)' }}>
          Lógica entre condições
        </label>
        <div className="flex gap-2">
          {(['and', 'or'] as const).map((l) => {
            const active = config.logic === l;
            return (
              <button
                key={l}
                onClick={() => onChange({ ...config, logic: l })}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                style={{
                  background: active ? 'var(--brand-500, #6366f1)' : 'var(--surface)',
                  color: active ? '#fff' : 'var(--ink-2)',
                  border: `1px solid ${active ? 'var(--brand-500, #6366f1)' : 'var(--edge)'}`,
                }}
              >
                {l === 'and' ? 'Todas (E)' : 'Qualquer (OU)'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        {conditions.map((c, i) => {
          const fieldDef = findFieldDef(c.target, c.field);
          const opDef = OPERATORS.find((o) => o.value === c.operator);
          return (
            <div
              key={i}
              className="p-3 rounded-lg space-y-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
            >
              <div className="flex items-center gap-2">
                <select
                  value={`${c.target}:${c.field}`}
                  onChange={(e) => {
                    const [target, field] = e.target.value.split(':') as [FilterCondition['target'], string];
                    update(i, { target, field });
                  }}
                  className="flex-1 px-2 py-1.5 rounded-md text-xs outline-none"
                  style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                >
                  {FILTER_CATALOG.map((g) => (
                    <optgroup key={g.target} label={g.label}>
                      {g.fields.map((f) => (
                        <option key={`${g.target}:${f.key}`} value={`${g.target}:${f.key}`}>
                          {f.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  onClick={() => remove(i)}
                  className="p-1.5 rounded-md hover:bg-red-500/10"
                  style={{ color: '#dc2626' }}
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={c.operator}
                  onChange={(e) => update(i, { operator: e.target.value as FilterCondition['operator'] })}
                  className="px-2 py-1.5 rounded-md text-xs outline-none"
                  style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                >
                  {OPERATORS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {opDef?.needsValue && (
                  <input
                    type={fieldDef?.type === 'number' ? 'number' : 'text'}
                    value={c.value ?? ''}
                    onChange={(e) => update(i, { value: e.target.value })}
                    placeholder="Valor"
                    className="flex-1 px-2 py-1.5 rounded-md text-xs outline-none"
                    style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                  />
                )}
              </div>
            </div>
          );
        })}

        <button
          onClick={add}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors hover:bg-[var(--surface-hover)]"
          style={{
            background: 'transparent',
            color: 'var(--brand-500, #6366f1)',
            border: '1px dashed var(--edge-strong, var(--edge))',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar condição
        </button>
      </div>
    </div>
  );
}

function SendWhatsappEditor({
  config,
  onChange,
}: {
  config: SendWhatsappStepConfig;
  onChange: (c: SendWhatsappStepConfig) => void;
}) {
  const qc = useQueryClient();
  const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: listChannels });
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: listTemplates });
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplBody, setTplBody] = useState('');

  const createTplMut = useMutation({
    mutationFn: () => createTemplate({ name: tplName.trim(), body: tplBody }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      onChange({ ...config, templateId: t.id });
      setShowNewTemplate(false);
      setTplName('');
      setTplBody('');
    },
  });

  return (
    <div>
      <p className="text-xs mb-4" style={{ color: 'var(--ink-2)' }}>
        Envia uma mensagem de WhatsApp usando o canal e o template escolhidos.
      </p>

      <div className="mb-4">
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-1)' }}>
          Canal
        </label>
        <select
          value={config.channelId ?? ''}
          onChange={(e) => onChange({ ...config, channelId: e.target.value })}
          className="w-full px-3 py-2.5 rounded-md text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
        >
          <option value="">Selecione um canal...</option>
          {channels.filter((c) => c.active).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold" style={{ color: 'var(--ink-1)' }}>
            Template
          </label>
          <button
            onClick={() => setShowNewTemplate((v) => !v)}
            className="text-xs font-semibold"
            style={{ color: 'var(--brand-500, #6366f1)' }}
          >
            {showNewTemplate ? 'Cancelar novo template' : '+ Criar template'}
          </button>
        </div>
        <select
          value={config.templateId ?? ''}
          onChange={(e) => onChange({ ...config, templateId: e.target.value })}
          className="w-full px-3 py-2.5 rounded-md text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
        >
          <option value="">Selecione um template...</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {showNewTemplate && (
        <div
          className="p-3 rounded-lg space-y-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
        >
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-1)' }}>
              Nome do template
            </label>
            <input
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="Ex: Boas-vindas"
              className="w-full px-2 py-1.5 rounded-md text-xs outline-none"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-1)' }}>
              Corpo
            </label>
            <textarea
              rows={4}
              value={tplBody}
              onChange={(e) => setTplBody(e.target.value)}
              placeholder="Olá {nome}, tudo bem?"
              className="w-full px-2 py-1.5 rounded-md text-xs outline-none resize-none"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
            <div className="mt-1 text-[11px]" style={{ color: 'var(--ink-3)' }}>
              Variáveis: {'{nome}'}, {'{agente}'}, {'{pipeline}'}, {'{etapa}'}
            </div>
          </div>
          <button
            onClick={() => createTplMut.mutate()}
            disabled={!tplName.trim() || !tplBody.trim() || createTplMut.isPending}
            className="w-full px-3 py-2 rounded-md text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            {createTplMut.isPending ? 'Criando...' : 'Salvar template'}
          </button>
        </div>
      )}
    </div>
  );
}
