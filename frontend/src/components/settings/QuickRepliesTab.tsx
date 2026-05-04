import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Zap, X, Check } from 'lucide-react';
import { listQuickReplies, createQuickReply, updateQuickReply, deleteQuickReply } from '@/api/quick-replies';
import type { QuickReply } from '@/types/api';

interface FormState {
  title: string;
  shortcut: string;
  body: string;
  category: string;
}

const empty: FormState = { title: '', shortcut: '', body: '', category: '' };

export default function QuickRepliesTab() {
  const qc = useQueryClient();
  const { data: replies = [], isLoading } = useQuery({
    queryKey: ['quick-replies'],
    queryFn: () => listQuickReplies(),
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setShowForm(true);
  };

  const openEdit = (qr: QuickReply) => {
    setEditing(qr);
    setForm({
      title: qr.title,
      shortcut: qr.shortcut ?? '',
      body: qr.body,
      category: qr.category ?? '',
    });
    setShowForm(true);
  };

  const close = () => {
    setShowForm(false);
    setEditing(null);
    setForm(empty);
  };

  const createMut = useMutation({
    mutationFn: () => createQuickReply({
      title: form.title.trim(),
      shortcut: form.shortcut.trim() || undefined,
      body: form.body.trim(),
      category: form.category.trim() || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quick-replies'] }); close(); },
  });

  const updateMut = useMutation({
    mutationFn: () => updateQuickReply(editing!.id, {
      title: form.title.trim(),
      shortcut: form.shortcut.trim() || undefined,
      body: form.body.trim(),
      category: form.category.trim() || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quick-replies'] }); close(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteQuickReply(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quick-replies'] }),
  });

  const canSave = form.title.trim().length > 0 && form.body.trim().length > 0;
  const isPending = createMut.isPending || updateMut.isPending;

  const grouped = replies.reduce<Record<string, QuickReply[]>>((acc, qr) => {
    const cat = qr.category ?? 'Geral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(qr);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Respostas Rápidas</h2>
          <p className="page-subtitle">
            Digite <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--surface-hover)' }}>/</code> no
            composer do inbox para buscar e inserir respostas rápidas.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Nova resposta
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)', boxShadow: 'var(--shadow-md)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
              {editing ? 'Editar resposta' : 'Nova resposta rápida'}
            </span>
            <button onClick={close}><X className="w-4 h-4" style={{ color: 'var(--ink-3)' }} /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-2)' }}>
                Título <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Boas-vindas"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-2)' }}>
                Atalho <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(sem barra, opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--ink-3)' }}>/</span>
                <input
                  value={form.shortcut}
                  onChange={(e) => setForm((f) => ({ ...f, shortcut: e.target.value.replace(/\s/g, '') }))}
                  placeholder="boasvindas"
                  className="w-full pl-6 pr-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-2)' }}>
              Mensagem <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Texto completo da resposta..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-2)' }}>Categoria (opcional)</label>
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Ex: Suporte, Vendas..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={close}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: 'var(--ink-2)', background: 'var(--surface-hover)' }}
            >
              Cancelar
            </button>
            <button
              onClick={() => editing ? updateMut.mutate() : createMut.mutate()}
              disabled={!canSave || isPending}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--brand-500)' }}
            >
              {isPending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar resposta'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading && (
        <div className="text-center py-10 text-sm" style={{ color: 'var(--ink-3)' }}>Carregando…</div>
      )}

      {!isLoading && replies.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-12 rounded-xl text-center"
          style={{ background: 'var(--surface)', border: '1px dashed var(--edge-strong)' }}
        >
          <Zap className="w-10 h-10 mb-3" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
          <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Nenhuma resposta rápida ainda</p>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
            Crie respostas para agilizar o atendimento no inbox
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
            {category}
          </h3>
          {items.map((qr) => (
            <div
              key={qr.id}
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', boxShadow: 'var(--shadow-md)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'var(--brand-50)' }}
              >
                <Zap className="w-4 h-4" style={{ color: 'var(--brand-500)' }} strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: 'var(--ink-1)' }}>{qr.title}</span>
                  {qr.shortcut && (
                    <code
                      className="text-[11px] px-1.5 py-0.5 rounded-md font-mono"
                      style={{ background: 'var(--brand-50)', color: 'var(--brand-500)', border: '1px solid rgba(99,91,255,0.2)' }}
                    >
                      /{qr.shortcut}
                    </code>
                  )}
                </div>
                <p className="text-xs mt-1 whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                  {qr.body}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(qr)}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--ink-3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-500)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => confirm(`Excluir "${qr.title}"?`) && deleteMut.mutate(qr.id)}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--ink-3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
