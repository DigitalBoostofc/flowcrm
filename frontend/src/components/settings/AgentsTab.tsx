import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, User as UserIcon, Crown } from 'lucide-react';
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
    onError: (err: any) => alert(err?.response?.data?.message ?? err?.message ?? 'Erro ao criar agente'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Agentes</h2>
          <p className="page-subtitle">Gerencie os usuários com acesso ao workspace.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Agente
        </button>
      </div>

      <div className="space-y-2">
        {users.map((u) => {
          const isOwner = u.role === 'owner';
          return (
            <div
              key={u.id}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', boxShadow: 'var(--shadow-md)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: isOwner ? 'var(--accent-bg, rgba(99,91,255,0.1))' : 'var(--surface-hover)',
                  border: '1px solid var(--edge)',
                }}
              >
                {isOwner
                  ? <Crown className="w-4 h-4" style={{ color: 'var(--accent)' }} strokeWidth={2} />
                  : <UserIcon className="w-4 h-4" style={{ color: 'var(--ink-3)' }} strokeWidth={1.75} />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--ink-1)' }}>{u.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{u.email}</span>
                  <span style={{ color: 'var(--edge-strong)' }}>·</span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: isOwner ? 'var(--accent)' : 'var(--ink-3)' }}
                  >
                    {isOwner ? 'Proprietário' : 'Agente'}
                  </span>
                </div>
              </div>

              {!isOwner && (
                <button
                  onClick={() => confirm(`Desativar ${u.name}?`) && deleteMutation.mutate(u.id)}
                  className="p-1.5 rounded-md transition-colors flex-shrink-0"
                  style={{ color: 'var(--ink-3)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-3)')}
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              )}
            </div>
          );
        })}

        {users.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-12 rounded-xl text-center"
            style={{ background: 'var(--surface)', border: '1px dashed var(--edge-strong)' }}
          >
            <UserIcon className="w-8 h-8 mb-3" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
            <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Nenhum agente cadastrado</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>Adicione agentes para compartilhar o acesso ao workspace</p>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo agente" description="Convide um novo usuário para o workspace.">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Nome</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome completo"
              className="input-base"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@empresa.com"
              className="input-base"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              className="input-base"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!form.name || !form.email || form.password.length < 6 || createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
