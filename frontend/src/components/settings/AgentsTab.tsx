import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { listUsers, createUser, deleteUser } from '@/api/users';
import Modal from '@/components/ui/Modal';

export default function AgentsTab() {
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const createMutation = useMutation({
    mutationFn: () => createUser({ ...form, role: 'agent' as const }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
      setForm({ name: '', email: '', password: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Agentes</h3>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm px-3 py-1.5 rounded-lg">
          <Plus className="w-4 h-4" /> Novo Agente
        </button>
      </div>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-100">{u.name}</div>
              <div className="text-xs text-slate-500">{u.email} • {u.role}</div>
            </div>
            {u.role !== 'owner' && (
              <button onClick={() => confirm(`Desativar ${u.name}?`) && deleteMutation.mutate(u.id)} className="text-slate-500 hover:text-red-400 p-2">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo agente">
        <div className="space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100" />
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100" />
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Senha (mín 6)" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-slate-400">Cancelar</button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!form.name || !form.email || form.password.length < 6 || createMutation.isPending}
              className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg"
            >
              Criar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
