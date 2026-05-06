import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, X, Users, Building2, ChevronDown, Loader2 } from 'lucide-react';
import { listPipelines } from '@/api/pipelines';
import { listWorkspaceMembers } from '@/api/users';
import { useAuthStore } from '@/store/auth.store';
import type { InboxItem } from '@/api/conversations';
import type { Pipeline } from '@/types/api';

interface Props {
  item: InboxItem;
  onConfirm: (payload: {
    name: string;
    type: 'person' | 'company';
    pipelineId: string;
    stageId: string;
    assignedToId: string;
  }) => Promise<void>;
  onClose: () => void;
}

export default function QualifyModal({ item, onConfirm, onClose }: Props) {
  const { user: me } = useAuthStore();
  const [type, setType] = useState<'person' | 'company'>('person');
  const [name, setName] = useState(item.contactName ?? '');
  const [pipelineId, setPipelineId] = useState('');
  const [stageId, setStageId] = useState('');
  const [assignedToId, setAssignedToId] = useState(me?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: pipelines = [] } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: listPipelines,
  });

  const { data: members = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['workspace-members'],
    queryFn: listWorkspaceMembers,
  });

  useEffect(() => {
    if (pipelines.length && !pipelineId) {
      const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
      setPipelineId(def.id);
      const sorted = (def.stages ?? []).slice().sort((a, b) => a.position - b.position);
      setStageId(sorted[0]?.id ?? '');
    }
  }, [pipelines, pipelineId]);

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId) ?? null;
  const stages = (selectedPipeline?.stages ?? []).slice().sort((a, b) => a.position - b.position);

  const handlePipelineChange = (id: string) => {
    setPipelineId(id);
    const p = pipelines.find((p) => p.id === id);
    const sorted = (p?.stages ?? []).slice().sort((a, b) => a.position - b.position);
    setStageId(sorted[0]?.id ?? '');
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Informe o nome.'); return; }
    if (!pipelineId) { setError('Selecione um funil.'); return; }
    if (!stageId) { setError('Selecione uma etapa.'); return; }
    if (!assignedToId) { setError('Selecione o responsável.'); return; }
    setSaving(true);
    setError('');
    try {
      await onConfirm({ name: name.trim(), type, pipelineId, stageId, assignedToId });
    } catch {
      setError('Erro ao qualificar. Tente novamente.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#f59e0b' }} />
            </span>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Qualificar contato</h3>
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{item.externalId ?? item.contactPhone}</p>
            </div>
          </div>
          <button onClick={onClose}>
            <X className="w-4 h-4" style={{ color: 'var(--ink-3)' }} />
          </button>
        </div>

        {/* Type selector */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--ink-2)' }}>Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType('person')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all"
              style={{
                background: type === 'person' ? 'var(--brand-50)' : 'var(--surface)',
                borderColor: type === 'person' ? 'var(--brand-500)' : 'var(--edge)',
                color: type === 'person' ? 'var(--brand-500)' : 'var(--ink-2)',
              }}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              Pessoa
            </button>
            <button
              onClick={() => setType('company')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all"
              style={{
                background: type === 'company' ? 'var(--brand-50)' : 'var(--surface)',
                borderColor: type === 'company' ? 'var(--brand-500)' : 'var(--edge)',
                color: type === 'company' ? 'var(--brand-500)' : 'var(--ink-2)',
              }}
            >
              <Building2 className="w-4 h-4 flex-shrink-0" />
              Empresa
            </button>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>
            {type === 'person' ? 'Nome da pessoa' : 'Nome da empresa'}
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'person' ? 'Ex: João Silva' : 'Ex: Acme Ltda'}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {/* Pipeline */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>Funil</label>
          <div className="relative">
            <select
              value={pipelineId}
              onChange={(e) => handlePipelineChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)', paddingRight: '2.5rem' }}
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--ink-3)' }} />
          </div>
        </div>

        {/* Stage */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>Etapa</label>
          <div className="relative">
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)', paddingRight: '2.5rem' }}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--ink-3)' }} />
          </div>
        </div>

        {/* Responsável */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>
            Responsável <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
          </label>
          <div className="relative">
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
              style={{ background: 'var(--surface)', border: `1px solid ${!assignedToId ? 'var(--danger, #ef4444)' : 'var(--edge)'}`, color: 'var(--ink-1)', paddingRight: '2.5rem' }}
            >
              <option value="">Selecione o responsável…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === me?.id ? `Eu (${m.name})` : m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--ink-3)' }} />
          </div>
        </div>

        {error && <p className="text-xs font-medium" style={{ color: 'var(--danger, #ef4444)' }}>{error}</p>}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm"
            style={{ color: 'var(--ink-2)', background: 'var(--surface-hover)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-500)' }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {saving ? 'Qualificando…' : 'Qualificar'}
          </button>
        </div>
      </div>
    </div>
  );
}
