import { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import type { Lead, Pipeline, User } from '@/types/api';
import { updateLead, moveLead } from '@/api/leads';
import Avatar from '@/components/ui/Avatar';

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>
      {children}
      {required && <span className="ml-1" style={{ color: 'var(--danger, #ef4444)' }}>*</span>}
    </label>
  );
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 rounded-lg outline-none text-sm"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--edge)',
        color: 'var(--ink-1)',
        ...props.style,
      }}
    />
  );
}

interface Props {
  lead: Lead;
  pipelines: Pipeline[];
  users: User[];
  open: boolean;
  onClose: () => void;
}

export default function EditLeadModal({ lead, pipelines, users, open, onClose }: Props) {
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [value, setValue] = useState('');
  const [pipelineId, setPipelineId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [conclusionDate, setConclusionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(lead.title ?? '');
    setAssignedToId(lead.assignedToId ?? '');
    setValue(lead.value != null ? String(lead.value) : '');
    setPipelineId(lead.pipelineId ?? '');
    setStartDate(lead.startDate ? String(lead.startDate).slice(0, 10) : '');
    setConclusionDate(lead.conclusionDate ? String(lead.conclusionDate).slice(0, 10) : '');
    setNotes(lead.notes ?? '');
    setError('');
  }, [open, lead]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('title');

      const updates: Promise<unknown>[] = [
        updateLead(lead.id, {
          title: title.trim(),
          value: value !== '' ? Number(value) : null,
          assignedToId: assignedToId || null,
          startDate: startDate || null,
          conclusionDate: conclusionDate || null,
          notes: notes.trim() || undefined,
        }),
      ];

      if (pipelineId && pipelineId !== lead.pipelineId) {
        const target = pipelines.find((p) => p.id === pipelineId);
        const firstStage = target?.stages?.slice().sort((a, b) => a.position - b.position)[0];
        if (firstStage) updates.push(moveLead(lead.id, firstStage.id));
      }

      return Promise.all(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      onClose();
    },
    onError: (err: any) => {
      if (err?.message === 'title') { setError('Informe o nome do negócio.'); return; }
      setError(err?.response?.data?.message ?? 'Erro ao salvar negócio.');
    },
  });

  if (!open) return null;

  const linkedName = lead.company?.name ?? lead.contact?.name ?? '—';
  const linkedAvatar = (lead.company as any)?.avatarUrl ?? lead.contact?.avatarUrl ?? null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="glass-raised rounded-xl shadow-2xl max-w-3xl w-full my-8 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{
            borderBottom: '1px solid var(--edge)',
            background: 'var(--surface-raised)',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ink-1)' }}>Editar negócio</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-3)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="px-6 py-5 space-y-6"
        >
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--ink-3)' }}>
              Dados básicos
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Empresa / Pessoa — read-only */}
              <div>
                <Label>Empresa / Pessoa</Label>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                >
                  <Avatar name={linkedName} url={linkedAvatar} size={24} />
                  <span className="text-sm" style={{ color: 'var(--ink-1)' }}>{linkedName}</span>
                </div>
              </div>

              {/* Nome do negócio */}
              <div>
                <Label required>Nome do negócio</Label>
                <FieldInput
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Proposta comercial"
                  autoFocus
                />
              </div>

              {/* Responsável */}
              <div>
                <Label>Responsável</Label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg outline-none text-sm"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--edge)',
                    color: assignedToId ? 'var(--ink-1)' : 'var(--ink-3)',
                  }}
                >
                  <option value="">Sem responsável</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Valor total */}
              <div>
                <Label>Valor total</Label>
                <FieldInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>

              {/* Funil */}
              <div>
                <Label>Funil</Label>
                <select
                  value={pipelineId}
                  onChange={(e) => setPipelineId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg outline-none text-sm"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--edge)',
                    color: pipelineId ? 'var(--ink-1)' : 'var(--ink-3)',
                  }}
                >
                  <option value="">Selecione um funil</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de início</Label>
                  <FieldInput
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Data de conclusão</Label>
                  <FieldInput
                    type="date"
                    value={conclusionDate}
                    onChange={(e) => setConclusionDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Escreva detalhes importantes sobre esse negócio"
                  className="w-full px-3 py-2 rounded-lg outline-none text-sm resize-none"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--edge)',
                    color: 'var(--ink-1)',
                  }}
                />
              </div>
            </div>
          </section>

          {error && (
            <div className="text-sm rounded-lg px-3 py-2" style={{ background: '#fee2e2', color: '#991b1b' }}>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pb-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
