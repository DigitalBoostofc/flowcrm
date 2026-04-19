import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Plus, Trash2, ChevronDown, ListChecks, AlertCircle,
} from 'lucide-react';
import type { Stage } from '@/types/api';
import {
  listStageRequiredFields,
  createStageRequiredField,
  deleteStageRequiredField,
  type StageRequiredField,
  type RequiredFieldTarget,
} from '@/api/stage-required-fields';
import {
  FIELD_CATALOG,
  findFieldLabel,
  findGroupLabel,
} from '@/lib/required-fields-catalog';

type View = 'list' | 'add';

export interface RequiredFieldsDrawerProps {
  open: boolean;
  stage: Stage | null;
  onClose: () => void;
}

export default function RequiredFieldsDrawer({ open, stage, onClose }: RequiredFieldsDrawerProps) {
  const qc = useQueryClient();
  const stageId = stage?.id ?? null;

  const { data: rules = [] } = useQuery({
    queryKey: ['stage-required-fields', stageId],
    queryFn: () => listStageRequiredFields(stageId!),
    enabled: !!stageId && open,
  });

  const [view, setView] = useState<View>('list');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setView('list');
      setSelectedKey('');
      setQuestion('');
      setFieldError(null);
      setDropdownOpen(false);
    }
  }, [open, stageId]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [dropdownOpen]);

  const takenKeys = useMemo(
    () => new Set(rules.map((r) => `${r.targetType}:${r.fieldKey}`)),
    [rules],
  );

  const availableCatalog = useMemo(
    () =>
      FIELD_CATALOG.map((g) => ({
        ...g,
        fields: g.fields.filter((f) => !takenKeys.has(`${g.target}:${f.key}`)),
      })).filter((g) => g.fields.length > 0),
    [takenKeys],
  );

  const selectedMeta = useMemo(() => {
    if (!selectedKey) return null;
    const [target, key] = selectedKey.split(':') as [RequiredFieldTarget, string];
    return { target, key, label: findFieldLabel(target, key), groupLabel: findGroupLabel(target) };
  }, [selectedKey]);

  const createMut = useMutation({
    mutationFn: (dto: { targetType: RequiredFieldTarget; fieldKey: string; question?: string | null }) =>
      createStageRequiredField(stageId!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stage-required-fields', stageId] });
      setView('list');
      setSelectedKey('');
      setQuestion('');
      setFieldError(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteStageRequiredField(stageId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stage-required-fields', stageId] }),
  });

  const handleSave = () => {
    if (!selectedMeta) {
      setFieldError('Por favor, selecione um campo.');
      return;
    }
    createMut.mutate({
      targetType: selectedMeta.target,
      fieldKey: selectedMeta.key,
      question: question.trim() ? question.trim() : null,
    });
  };

  const handleDelete = (rule: StageRequiredField) => {
    const label = findFieldLabel(rule.targetType, rule.fieldKey);
    if (confirm(`Remover o campo "${label}"?`)) deleteMut.mutate(rule.id);
  };

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
          width: 'min(480px, 100vw)',
          background: 'var(--surface-raised, #fff)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          borderLeft: '1px solid var(--edge)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex items-start justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--edge)' }}
        >
          <div className="min-w-0">
            <h2 className="text-base font-bold leading-snug" style={{ color: 'var(--ink-1)' }}>
              Configurar campos da etapa{' '}
              <span style={{ color: 'var(--brand-500, #6366f1)' }}>
                "{stage?.name ?? ''}"
              </span>
            </h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
              Escolha um campo de negócio, empresa ou pessoa que será obrigatório nesta etapa.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] flex-shrink-0"
            style={{ color: 'var(--ink-3)' }}
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {view === 'list' ? (
            rules.length === 0 ? (
              <EmptyState onAdd={() => setView('add')} />
            ) : (
              <div className="space-y-2">
                {rules.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--brand-500, #6366f1)' }}
                    >
                      <ListChecks className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--ink-3)' }}>
                        {findGroupLabel(r.targetType)}
                      </div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
                        {findFieldLabel(r.targetType, r.fieldKey)}
                      </div>
                      {r.question && (
                        <div className="mt-1 text-xs italic" style={{ color: 'var(--ink-2)' }}>
                          "{r.question}"
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(r)}
                      className="p-1.5 rounded-md hover:bg-red-500/10"
                      style={{ color: '#dc2626' }}
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => setView('add')}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
                  style={{ background: 'var(--brand-500, #6366f1)' }}
                >
                  <Plus className="w-4 h-4" />
                  Adicionar campo
                </button>
              </div>
            )
          ) : (
            <div>
              <p className="text-xs mb-4" style={{ color: 'var(--ink-2)' }}>
                O usuário não poderá mover o negócio para a próxima etapa até que o campo esteja preenchido.
              </p>

              <div className="mb-5" ref={dropdownRef}>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-1)' }}>
                  Campo obrigatório
                </label>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm outline-none"
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${fieldError ? '#dc2626' : 'var(--edge)'}`,
                    color: selectedMeta ? 'var(--ink-1)' : 'var(--ink-3)',
                  }}
                >
                  <span className="truncate text-left">
                    {selectedMeta
                      ? `${selectedMeta.groupLabel} • ${selectedMeta.label}`
                      : 'Digite o nome do campo'}
                  </span>
                  <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: 'var(--ink-3)' }} />
                </button>
                {dropdownOpen && (
                  <div
                    className="mt-1 rounded-md shadow-lg max-h-72 overflow-y-auto"
                    style={{
                      background: 'var(--surface-raised, #fff)',
                      border: '1px solid var(--edge)',
                    }}
                  >
                    {availableCatalog.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-center" style={{ color: 'var(--ink-3)' }}>
                        Todos os campos já foram adicionados.
                      </div>
                    ) : (
                      availableCatalog.map((group) => (
                        <div key={group.target}>
                          <div
                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
                            style={{ background: 'var(--surface)', color: 'var(--ink-3)' }}
                          >
                            {group.label}
                          </div>
                          {group.fields.map((f) => {
                            const k = `${group.target}:${f.key}`;
                            const isSelected = selectedKey === k;
                            return (
                              <button
                                key={k}
                                onClick={() => {
                                  setSelectedKey(k);
                                  setDropdownOpen(false);
                                  setFieldError(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-hover)]"
                                style={{
                                  color: 'var(--ink-1)',
                                  background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                                }}
                              >
                                {f.label}
                              </button>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                )}
                {fieldError && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: '#dc2626' }}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fieldError}
                  </div>
                )}
              </div>

              <div className="mb-5">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-1)' }}>
                  Pergunta para qualificação desse campo{' '}
                  <span className="font-normal" style={{ color: 'var(--ink-3)' }}>(Opcional)</span>
                </label>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ex: Qual o prazo final desta negociação?"
                  className="w-full px-3 py-2.5 rounded-md text-sm outline-none"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--edge)',
                    color: 'var(--ink-1)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {view === 'add' && (
          <div
            className="flex items-center justify-end gap-2 px-5 py-3"
            style={{ borderTop: '1px solid var(--edge)', background: 'var(--surface)' }}
          >
            <button
              onClick={() => {
                setView('list');
                setSelectedKey('');
                setQuestion('');
                setFieldError(null);
              }}
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-2)', background: 'transparent' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={createMut.isPending}
              className="px-4 py-2 rounded-md text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--brand-500, #6366f1)' }}
            >
              {createMut.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-5"
        style={{ background: 'rgba(99,102,241,0.08)' }}
      >
        <ListChecks className="w-10 h-10" style={{ color: 'var(--brand-500, #6366f1)' }} />
      </div>
      <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--ink-1)' }}>
        Crie regra de campos obrigatórios
      </h3>
      <p className="text-xs mb-5 max-w-xs" style={{ color: 'var(--ink-3)' }}>
        Garanta que informações importantes sejam preenchidas antes de avançar o negócio para a próxima etapa.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
        style={{ background: 'var(--brand-500, #6366f1)' }}
      >
        <Plus className="w-4 h-4" />
        Adicionar campo
      </button>
    </div>
  );
}
