import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, User as UserIcon, Crown, Briefcase, ShoppingBag } from 'lucide-react';
import { listUsers, createUser, deleteUser } from '@/api/users';
import Modal from '@/components/ui/Modal';

type CollaboratorRole = 'manager' | 'seller';

const ROLE_LIMITS: Record<CollaboratorRole, number> = {
  manager: 1,
  seller: 3,
};

const ROLE_LABEL: Record<CollaboratorRole, string> = {
  manager: 'Gerente',
  seller: 'Vendedor',
};

const ROLE_DESCRIPTION: Record<CollaboratorRole, string> = {
  manager: 'Gerencia o workspace ao lado do proprietário.',
  seller: 'Atende negócios, clientes e tarefas do dia a dia.',
};

export default function AgentsTab() {
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<CollaboratorRole>('seller');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const counts = useMemo(() => {
    return {
      manager: users.filter((u) => u.role === 'manager' && (u as any).active !== false).length,
      seller: users.filter((u) => u.role === 'seller' && (u as any).active !== false).length,
    };
  }, [users]);

  const createMutation = useMutation({
    mutationFn: () => createUser({ ...form, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
      setForm({ name: '', email: '', password: '' });
    },
    onError: (err: any) => alert(err?.response?.data?.message ?? err?.message ?? 'Erro ao criar colaborador'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const openModal = () => {
    const initial: CollaboratorRole = counts.seller < ROLE_LIMITS.seller
      ? 'seller'
      : counts.manager < ROLE_LIMITS.manager
        ? 'manager'
        : 'seller';
    setRole(initial);
    setForm({ name: '', email: '', password: '' });
    setOpen(true);
  };

  const roleAvailable = (r: CollaboratorRole) => counts[r] < ROLE_LIMITS[r];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Colaboradores</h2>
          <p className="page-subtitle">Convide gerentes e vendedores para compartilhar o acesso ao workspace.</p>
        </div>
        <button onClick={openModal} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Colaborador
        </button>
      </div>

      <div className="space-y-2">
        {users.map((u) => {
          const isOwner = u.role === 'owner';
          const isManager = u.role === 'manager';
          const isSeller = u.role === 'seller';
          const Icon = isOwner ? Crown : isManager ? Briefcase : isSeller ? ShoppingBag : UserIcon;
          const label = isOwner
            ? 'Proprietário'
            : isManager
              ? 'Gerente'
              : isSeller
                ? 'Vendedor'
                : 'Agente';
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
                <Icon className="w-4 h-4" style={{ color: isOwner ? 'var(--accent)' : 'var(--ink-3)' }} strokeWidth={isOwner ? 2 : 1.75} />
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
                    {label}
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
            <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Nenhum colaborador cadastrado</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>Adicione gerentes ou vendedores para compartilhar o acesso ao workspace</p>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo colaborador" description="Escolha o tipo de acesso e preencha os dados de login.">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Tipo de acesso</label>
            <div className="grid grid-cols-2 gap-2">
              {(['manager', 'seller'] as CollaboratorRole[]).map((r) => {
                const selected = role === r;
                const available = roleAvailable(r);
                const disabled = !available && !selected;
                const Icon = r === 'manager' ? Briefcase : ShoppingBag;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { if (available) setRole(r); }}
                    disabled={disabled}
                    className="text-left p-3 rounded-lg transition-colors"
                    style={{
                      background: selected ? 'var(--brand-50)' : 'var(--surface)',
                      border: `1px solid ${selected ? 'var(--brand-500)' : 'var(--edge)'}`,
                      opacity: disabled ? 0.5 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" style={{ color: selected ? 'var(--brand-500)' : 'var(--ink-2)' }} strokeWidth={1.75} />
                      <span className="text-sm font-medium" style={{ color: selected ? 'var(--brand-500)' : 'var(--ink-1)' }}>
                        {ROLE_LABEL[r]}
                      </span>
                    </div>
                    <div className="text-[11px] leading-snug" style={{ color: 'var(--ink-3)' }}>
                      {ROLE_DESCRIPTION[r]}
                    </div>
                    <div className="text-[10px] mt-1.5 font-semibold uppercase tracking-wider" style={{ color: available ? 'var(--ink-3)' : 'var(--danger)' }}>
                      {counts[r]}/{ROLE_LIMITS[r]} {available ? 'em uso' : 'limite atingido'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

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
              disabled={
                !form.name ||
                !form.email ||
                form.password.length < 6 ||
                !roleAvailable(role) ||
                createMutation.isPending
              }
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
