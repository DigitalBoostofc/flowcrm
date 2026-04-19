import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FileText } from 'lucide-react';
import { listTemplates, createTemplate, deleteTemplate } from '@/api/templates';
import Modal from '@/components/ui/Modal';

export default function TemplatesTab() {
  const qc = useQueryClient();
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: listTemplates });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', body: '' });

  const createMut = useMutation({
    mutationFn: () => createTemplate(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      setOpen(false);
      setForm({ name: '', body: '' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Templates</h2>
          <p className="page-subtitle">Mensagens prontas para automações e envios manuais.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Novo Template
        </button>
      </div>

      <div
        className="text-xs px-3 py-2 rounded-lg"
        style={{ background: 'var(--brand-50)', color: 'var(--brand-500)', border: '1px solid rgba(99,91,255,0.2)' }}
      >
        Variáveis disponíveis: <code>{'{{nome}}'}</code> · <code>{'{{agente}}'}</code> · <code>{'{{pipeline}}'}</code> · <code>{'{{etapa}}'}</code>
      </div>

      <div className="space-y-2">
        {templates.map(t => (
          <div
            key={t.id}
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', boxShadow: 'var(--shadow-md)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'var(--brand-50)' }}
            >
              <FileText className="w-4 h-4" style={{ color: 'var(--brand-500)' }} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium" style={{ color: 'var(--ink-1)' }}>{t.name}</div>
              <div className="text-xs mt-1 whitespace-pre-wrap break-words leading-relaxed" style={{ color: 'var(--ink-3)' }}>{t.body}</div>
            </div>
            <button
              onClick={() => confirm(`Excluir "${t.name}"?`) && deleteMut.mutate(t.id)}
              className="p-1.5 rounded-md transition-colors flex-shrink-0"
              style={{ color: 'var(--ink-3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        ))}
        {templates.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-12 rounded-xl text-center"
            style={{ background: 'var(--surface)', border: '1px dashed var(--edge-strong)' }}
          >
            <FileText className="w-8 h-8 mb-3" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
            <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Nenhum template ainda</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>Crie templates para usar nas automações</p>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo template" description="Crie uma mensagem reutilizável com variáveis dinâmicas.">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Nome do template</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Boas-vindas"
              className="input-base"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Mensagem</label>
            <textarea
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              rows={5}
              placeholder={`Olá {{nome}}! Obrigado pelo interesse...`}
              className="input-base"
              style={{ height: 'auto', paddingTop: 8, paddingBottom: 8, resize: 'none' }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
            <button
              onClick={() => createMut.mutate()}
              disabled={!form.name || !form.body || createMut.isPending}
              className="btn-primary"
            >
              {createMut.isPending ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
