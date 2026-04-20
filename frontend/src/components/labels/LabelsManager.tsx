import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { listLabels, createLabel, updateLabel, deleteLabel, type Label } from '@/api/labels';

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E',
  '#10B981', '#06B6D4', '#3B82F6', '#6366F1',
  '#8B5CF6', '#EC4899', '#64748B', '#1F2937',
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-md transition-transform hover:scale-110 flex items-center justify-center"
          style={{ background: c }}
        >
          {value === c && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </button>
      ))}
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-6 h-6 rounded-md cursor-pointer border-0 p-0"
        title="Cor personalizada"
        style={{ background: 'transparent' }}
      />
    </div>
  );
}

function LabelRow({ label, onEdit, onDelete }: {
  label: Label;
  onEdit: (l: Label) => void;
  onDelete: (l: Label) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg group" style={{ background: 'var(--surface-hover)' }}>
      <div className="w-8 h-5 rounded-md flex-shrink-0" style={{ background: label.color }} />
      <span className="flex-1 text-sm truncate" style={{ color: 'var(--ink-1)' }}>
        {label.name || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>sem nome</span>}
      </span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(label)} className="p-1 rounded hover:bg-[var(--surface)]" style={{ color: 'var(--ink-3)' }}>
          <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <button onClick={() => onDelete(label)} className="p-1 rounded hover:bg-[var(--surface)]" style={{ color: 'var(--danger)' }}>
          <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function LabelForm({ label, onSave, onCancel }: {
  label?: Label;
  onSave: (data: { name: string; color: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(label?.name ?? '');
  const [color, setColor] = useState(label?.color ?? PRESET_COLORS[0]);

  return (
    <div className="space-y-3 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: color }} />
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nome da etiqueta"
          className="flex-1 px-2 py-1.5 rounded-lg text-sm outline-none"
          style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
          autoFocus
        />
      </div>
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-ghost flex-1 justify-center text-xs">Cancelar</button>
        <button
          onClick={() => onSave({ name, color })}
          disabled={!color}
          className="btn-primary flex-1 justify-center text-xs disabled:opacity-40"
        >
          {label ? 'Salvar' : 'Criar etiqueta'}
        </button>
      </div>
    </div>
  );
}

export default function LabelsManager() {
  const qc = useQueryClient();
  const { data: labels = [] } = useQuery({ queryKey: ['labels'], queryFn: listLabels });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Label | null>(null);

  const createMut = useMutation({
    mutationFn: createLabel,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['labels'] }); setCreating(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; color: string }) =>
      updateLabel(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['labels'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteLabel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Etiquetas</h3>
        {!creating && (
          <button onClick={() => setCreating(true)} className="btn-ghost text-xs gap-1">
            <Plus className="w-3.5 h-3.5" /> Nova etiqueta
          </button>
        )}
      </div>

      {labels.map(label => (
        editing?.id === label.id ? (
          <LabelForm
            key={label.id}
            label={label}
            onSave={data => updateMut.mutate({ id: label.id, ...data })}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <LabelRow
            key={label.id}
            label={label}
            onEdit={setEditing}
            onDelete={l => confirm(`Excluir etiqueta "${l.name}"?`) && deleteMut.mutate(l.id)}
          />
        )
      ))}

      {labels.length === 0 && !creating && (
        <p className="text-xs text-center py-4" style={{ color: 'var(--ink-3)' }}>
          Nenhuma etiqueta ainda. Crie sua primeira etiqueta.
        </p>
      )}

      {creating && (
        <LabelForm
          onSave={data => createMut.mutate(data)}
          onCancel={() => setCreating(false)}
        />
      )}
    </div>
  );
}
