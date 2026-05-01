import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Key, CheckCircle2, XCircle, Loader2, Plus, Power, Edit2, Trash2 } from 'lucide-react';
import {
  aiAgents,
  type Agent,
  type AgentPersona,
  type CreateAgentInput,
} from '@/api/ai-agents';

const MODELS = [
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — rápido, ideal pra atendimento' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — balanceado, bom pra qualificação' },
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7 — premium, para casos complexos' },
];

const PERSONAS: { id: AgentPersona; label: string; example: string }[] = [
  { id: 'formal', label: 'Formal', example: '"Bom dia, em que posso auxiliá-lo?"' },
  { id: 'proxima', label: 'Próxima', example: '"Oi! Como posso te ajudar?"' },
  { id: 'divertida', label: 'Divertida', example: '"E aí! 👋 Bora resolver isso juntos?"' },
];

export default function AiAgentsTab() {
  const qc = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: aiAgents.getSettings,
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: aiAgents.list,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold flex items-center gap-2" style={{ color: 'var(--ink-1)' }}>
          <Sparkles className="w-5 h-5" style={{ color: 'var(--brand-500)' }} />
          Agentes IA
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Configure assistentes inteligentes que atendem leads pelo WhatsApp, qualificam B2B/B2C e movem o funil sozinhos.
        </p>
      </div>

      {settingsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ink-3)' }} />
        </div>
      ) : settings ? (
        <ConnectionCard settings={settings} onChanged={() => qc.invalidateQueries({ queryKey: ['ai-settings'] })} />
      ) : null}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink-1)' }}>
            Seus agentes
          </h2>
          <CreateAgentButton onCreated={() => qc.invalidateQueries({ queryKey: ['ai-agents'] })} />
        </div>

        {agentsLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto my-6" style={{ color: 'var(--ink-3)' }} />
        ) : agents.length === 0 ? (
          <EmptyAgentsState />
        ) : (
          <div className="space-y-2">
            {agents.map((a) => (
              <AgentRow key={a.id} agent={a} onChanged={() => qc.invalidateQueries({ queryKey: ['ai-agents'] })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionCard({
  settings,
  onChanged,
}: {
  settings: NonNullable<ReturnType<typeof aiAgents.getSettings> extends Promise<infer T> ? T : never>;
  onChanged: () => void;
}) {
  const [keySource, setKeySource] = useState<'platform' | 'byo'>(settings.keySource);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(settings.defaultModel);
  const [enabled, setEnabled] = useState(settings.enabled);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const saveMut = useMutation({
    mutationFn: aiAgents.updateSettings,
    onSuccess: () => {
      onChanged();
      setApiKey('');
    },
  });

  async function runValidate() {
    setValidating(true);
    try {
      const res = await aiAgents.validate();
      setValidationResult(res);
      if (res.ok) onChanged();
    } finally {
      setValidating(false);
    }
  }

  function save() {
    saveMut.mutate({
      keySource,
      ...(keySource === 'byo' && apiKey ? { apiKey } : {}),
      defaultModel: model,
      enabled,
    });
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--ink-1)' }}>
          <Key className="w-4 h-4" />
          Conexão Anthropic
        </h2>
        {settings.enabled && settings.lastValidatedAt && (
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--success)' }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Conectado
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
            Origem da chave
          </label>
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={() => setKeySource('platform')}
              className="flex-1 px-3 py-2 rounded-lg text-sm transition-colors"
              style={
                keySource === 'platform'
                  ? { background: 'var(--brand-500)', color: '#fff' }
                  : { background: 'var(--surface-hover)', color: 'var(--ink-2)', border: '1px solid var(--edge)' }
              }
            >
              Plataforma (incluído no plano)
            </button>
            <button
              onClick={() => setKeySource('byo')}
              className="flex-1 px-3 py-2 rounded-lg text-sm transition-colors"
              style={
                keySource === 'byo'
                  ? { background: 'var(--brand-500)', color: '#fff' }
                  : { background: 'var(--surface-hover)', color: 'var(--ink-2)', border: '1px solid var(--edge)' }
              }
            >
              Minha API Key
            </button>
          </div>
        </div>

        {keySource === 'byo' && (
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
              API Key Anthropic {settings.apiKeyMasked && <span style={{ color: 'var(--ink-3)' }}>(atual: {settings.apiKeyMasked})</span>}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="w-full mt-1.5 px-3 py-2 rounded-lg text-sm font-mono outline-none"
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--ink-3)' }}>
              Crie sua key em{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--brand-500)', textDecoration: 'underline' }}
              >
                console.anthropic.com
              </a>
              . Você paga direto a Anthropic pelo uso.
            </p>
          </div>
        )}

        <div>
          <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
            Modelo padrão
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full mt-1.5 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--ink-1)' }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          IA habilitada neste workspace
        </label>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={save}
            disabled={saveMut.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: 'var(--brand-500)', color: '#fff' }}
          >
            {saveMut.isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            onClick={runValidate}
            disabled={validating}
            className="px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50"
            style={{ border: '1px solid var(--edge)', color: 'var(--ink-2)', background: 'transparent' }}
          >
            {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Testar conexão
          </button>
          {validationResult && (
            <span
              className="text-xs flex items-center gap-1"
              style={{ color: validationResult.ok ? 'var(--success)' : 'var(--danger)' }}
            >
              {validationResult.ok ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" /> {validationResult.error ?? 'Falha'}
                </>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateAgentButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
        style={{ background: 'var(--brand-500)', color: '#fff' }}
      >
        <Plus className="w-4 h-4" />
        Novo agente
      </button>
      {open && <AgentEditorModal onClose={() => setOpen(false)} onSaved={onCreated} />}
    </>
  );
}

function AgentRow({ agent, onChanged }: { agent: Agent; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const removeMut = useMutation({
    mutationFn: () => aiAgents.remove(agent.id),
    onSuccess: onChanged,
  });
  const toggleMut = useMutation({
    mutationFn: () => aiAgents.update(agent.id, { active: !agent.active }),
    onSuccess: onChanged,
  });

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: agent.active ? 'var(--success-bg)' : 'var(--surface-hover)',
            color: agent.active ? 'var(--success)' : 'var(--ink-3)',
          }}
        >
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium" style={{ color: 'var(--ink-1)' }}>
            {agent.name}
          </div>
          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {personaLabel(agent.persona)} · {agent.model}
            {agent.config?.maxMessagesPerConv ? ` · max ${agent.config.maxMessagesPerConv} msgs/conv` : ''}
          </div>
        </div>
        <button
          onClick={() => toggleMut.mutate()}
          disabled={toggleMut.isPending}
          title={agent.active ? 'Pausar' : 'Ativar'}
          className="p-1.5 rounded-md disabled:opacity-50"
          style={{ color: agent.active ? 'var(--success)' : 'var(--ink-3)' }}
        >
          <Power className="w-4 h-4" />
        </button>
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-md"
          style={{ color: 'var(--ink-3)' }}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => removeMut.mutate()}
          disabled={removeMut.isPending}
          className="p-1.5 rounded-md disabled:opacity-50"
          style={{ color: 'var(--danger)' }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {editing && (
        <AgentEditorModal
          agent={agent}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}
    </>
  );
}

function AgentEditorModal({
  agent,
  onClose,
  onSaved,
}: {
  agent?: Agent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(agent?.name ?? '');
  const [persona, setPersona] = useState<AgentPersona>(agent?.persona ?? 'proxima');
  const [model, setModel] = useState(agent?.model ?? 'claude-haiku-4-5');
  const [maxMsgs, setMaxMsgs] = useState(agent?.config?.maxMessagesPerConv ?? 5);
  const [cooldown, setCooldown] = useState(agent?.config?.cooldownSeconds ?? 30);
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? '');

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: CreateAgentInput = {
        name, persona, model, systemPrompt,
        maxMessagesPerConv: maxMsgs,
        cooldownSeconds: cooldown,
      };
      if (agent) return aiAgents.update(agent.id, payload);
      return aiAgents.create(payload);
    },
    onSuccess: onSaved,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl p-6"
        style={{ background: 'var(--surface)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink-1)' }}>
          {agent ? 'Editar agente' : 'Novo agente'}
        </h2>

        <div className="space-y-3">
          <Field label="Nome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Júlia"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </Field>

          <Field label="Personalidade">
            <div className="grid grid-cols-3 gap-2">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  className="px-2 py-2 rounded-lg text-xs"
                  style={
                    persona === p.id
                      ? { background: 'var(--brand-500)', color: '#fff' }
                      : { background: 'var(--surface-hover)', color: 'var(--ink-2)', border: '1px solid var(--edge)' }
                  }
                >
                  <div className="font-medium">{p.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">{p.example}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Modelo">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Máx. msgs por conversa">
              <input
                type="number"
                min={1}
                max={50}
                value={maxMsgs}
                onChange={(e) => setMaxMsgs(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              />
            </Field>
            <Field label="Cooldown (segundos)">
              <input
                type="number"
                min={5}
                max={600}
                value={cooldown}
                onChange={(e) => setCooldown(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              />
            </Field>
          </div>

          <Field label="System Prompt (avançado, opcional)">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              placeholder="Deixe vazio pra gerar automaticamente a partir da persona"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ color: 'var(--ink-2)' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={!name.trim() || saveMut.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: 'var(--brand-500)', color: '#fff' }}
          >
            {saveMut.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--ink-2)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function EmptyAgentsState() {
  return (
    <div
      className="text-center py-10 rounded-xl"
      style={{ background: 'var(--surface)', border: '1px dashed var(--edge)' }}
    >
      <Sparkles className="w-10 h-10 mx-auto" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
      <p className="text-sm font-medium mt-3" style={{ color: 'var(--ink-2)' }}>
        Nenhum agente configurado
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
        Crie um agente IA pra começar a atender leads automaticamente.
      </p>
    </div>
  );
}

function personaLabel(p: AgentPersona): string {
  return p === 'formal' ? 'Formal' : p === 'divertida' ? 'Divertida' : 'Próxima';
}
