import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { listTemplates, createTemplate, deleteTemplate } from '@/api/templates';
import Modal from '@/components/ui/Modal';

export default function TemplatesTab() {
  const queryClient = useQueryClient();
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: listTemplates });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', body: '' });

  const createMutation = useMutation({
    mutationFn: () => createTemplate(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setOpen(false);
      setForm({ name: '', body: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Templates de mensagem</h3>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm px-3 py-1.5 rounded-lg">
          <Plus className="w-4 h-4" /> Novo Template
        </button>
      </div>
      <p className="text-xs text-slate-500">Use {'{nome}'}, {'{agente}'}, {'{pipeline}'}, {'{etapa}'} como variáveis</p>
      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="bg-slate-800 rounded-xl p-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-slate-100">{t.name}</div>
              <div className="text-xs text-slate-400 mt-1 whitespace-pre-wrap break-words">{t.body}</div>
            </div>
            <button onClick={() => confirm(`Excluir ${t.name}?`) && deleteMutation.mutate(t.id)} className="text-slate-500 hover:text-red-400 p-2 flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {templates.length === 0 && <div className="text-sm text-slate-500">Nenhum template ainda</div>}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo template">
        <div className="space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome (ex: Boas-vindas)" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100" />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} placeholder="Olá {nome}! Obrigado pelo interesse..." className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 resize-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-slate-400">Cancelar</button>
            <button onClick={() => createMutation.mutate()} disabled={!form.name || !form.body} className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg">Criar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
