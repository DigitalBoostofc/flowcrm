import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, User as UserIcon, Crown, Briefcase, ShoppingBag, RotateCcw, ShieldCheck, Eye, EyeOff, Pencil, X } from 'lucide-react';
import { listUsers, createUser, deleteUser, updateUserRole, setUserActive } from '@/api/users';
import Modal from '@/components/ui/Modal';

type CollaboratorRole = 'manager' | 'seller' | 'agent';

const ROLE_LIMITS: Record<Exclude<CollaboratorRole, 'agent'>, number> = {
  manager: 1,
  seller: 3,
};

const ROLE_LABEL: Record<CollaboratorRole, string> = {
  manager: 'Gerente',
  seller: 'Vendedor',
  agent: 'Agente',
};

const ROLE_DESCRIPTION: Record<CollaboratorRole, string> = {
  manager: 'Gerencia o workspace ao lado do proprietário.',
  seller: 'Atende negócios, clientes e tarefas do dia a dia.',
  agent: 'Acesso básico a negócios atribuídos.',
};

const PERMISSIONS = [
  { label: 'Ver todos os negócios',        owner: true,  manager: true,  seller: false, agent: false },
  { label: 'Ver apenas negócios próprios', owner: true,  manager: true,  seller: true,  agent: true  },
  { label: 'Criar / editar negócios',      owner: true,  manager: true,  seller: true,  agent: true  },
  { label: 'Excluir negócios',             owner: true,  manager: false, seller: false, agent: false },
  { label: 'Relatórios e Analytics',       owner: true,  manager: true,  seller: false, agent: false },
  { label: 'Configurações do workspace',   owner: true,  manager: false, seller: false, agent: false },
  { label: 'Gerenciar colaboradores',      owner: true,  manager: false, seller: false, agent: false },
  { label: 'Automações e templates',       owner: true,  manager: true,  seller: false, agent: false },
  { label: 'Canais WhatsApp',              owner: true,  manager: true,  seller: false, agent: false },
];

function Check({ ok }: { ok: boolean }) {
  return ok
    ? <span className="text-emerald-500 font-bold text-sm">✓</span>
    : <span className="text-gray-300 text-sm">–</span>;
}

export default function AgentsTab() {
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const [open, setOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [role, setRole] = useState<CollaboratorRole>('seller');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const active = useMemo(() => users.filter(u => (u as any).active !== false), [users]);
  const inactive = useMemo(() => users.filter(u => (u as any).active === false), [users]);

  const counts = useMemo(() => ({
    manager: active.filter(u => u.role === 'manager').length,
    seller: active.filter(u => u.role === 'seller').length,
  }), [active]);

  const createMutation = useMutation({
    mutationFn: () => createUser({ ...form, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
      setForm({ name: '', email: '', password: '' });
    },
    onError: (err: any) => alert(err?.response?.data?.message ?? err?.message ?? 'Erro ao criar colaborador'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: CollaboratorRole }) => updateUserRole(id, role),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setEditingRole(null); },
    onError: (err: any) => alert(err?.response?.data?.message ?? err?.message ?? 'Erro ao alterar papel'),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setUserActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const openModal = () => {
    const initial: CollaboratorRole = counts.seller < ROLE_LIMITS.seller
      ? 'seller'
      : counts.manager < ROLE_LIMITS.manager ? 'manager' : 'seller';
    setRole(initial);
    setForm({ name: '', email: '', password: '' });
    setOpen(true);
  };

  const roleAvailable = (r: Exclude<CollaboratorRole, 'agent'>) => counts[r] < ROLE_LIMITS[r];

  function UserRow({ u, canEdit }: { u: any; canEdit: boolean }) {
    const isOwner = u.role === 'owner';
    const isActive = (u as any).active !== false;
    const Icon = isOwner ? Crown : u.role === 'manager' ? Briefcase : u.role === 'seller' ? ShoppingBag : UserIcon;
    const label = isOwner ? 'Proprietário' : ROLE_LABEL[u.role as CollaboratorRole] ?? u.role;
    const isEditingThis = editingRole === u.id;

    return (
      <div
        className="flex items-center gap-4 p-4 rounded-xl"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--edge)',
          boxShadow: 'var(--shadow-md)',
          opacity: isActive ? 1 : 0.55,
        }}
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: 'var(--ink-1)' }}>{u.name}</span>
            {!isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--surface-hover)', color: 'var(--ink-3)' }}>Inativo</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{u.email}</span>
            <span style={{ color: 'var(--edge-strong)' }}>·</span>
            {isEditingThis && canEdit && !isOwner ? (
              <div className="flex items-center gap-1">
                <select
                  className="text-xs rounded px-1.5 py-0.5"
                  style={{ border: '1px solid var(--edge)', background: 'var(--surface)', color: 'var(--ink-1)' }}
                  defaultValue={u.role}
                  onChange={e => roleMutation.mutate({ id: u.id, role: e.target.value as CollaboratorRole })}
                >
                  {(['manager', 'seller', 'agent'] as CollaboratorRole[]).map(r => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
                <button onClick={() => setEditingRole(null)} className="p-0.5" style={{ color: 'var(--ink-3)' }}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="text-xs font-medium" style={{ color: isOwner ? 'var(--accent)' : 'var(--ink-3)' }}>{label}</span>
            )}
          </div>
        </div>

        {!isOwner && canEdit && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {isActive ? (
              <>
                <button
                  onClick={() => setEditingRole(isEditingThis ? null : u.id)}
                  title="Alterar papel"
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: isEditingThis ? 'var(--accent)' : 'var(--ink-3)' }}
                >
                  <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => confirm(`Desativar ${u.name}?`) && deleteMutation.mutate(u.id)}
                  title="Desativar"
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--ink-3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </>
            ) : (
              <button
                onClick={() => activeMutation.mutate({ id: u.id, active: true })}
                title="Reativar"
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--ink-3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Colaboradores</h2>
          <p className="page-subtitle">Gerencie papéis e permissões de acesso da sua equipe.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPermissions(v => !v)}
            className="btn-ghost flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            Permissões
          </button>
          <button onClick={openModal} className="btn-primary">
            <Plus className="w-4 h-4" /> Novo Colaborador
          </button>
        </div>
      </div>

      {showPermissions && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--edge)', background: 'var(--surface)' }}
        >
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--edge)', background: 'var(--surface-hover)' }}>
            <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
            <span className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Matriz de permissões</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--edge)' }}>
                  <th className="text-left px-4 py-2.5 font-medium text-xs" style={{ color: 'var(--ink-3)' }}>Permissão</th>
                  {['Proprietário', 'Gerente', 'Vendedor', 'Agente'].map(r => (
                    <th key={r} className="text-center px-4 py-2.5 font-medium text-xs" style={{ color: 'var(--ink-3)' }}>{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p, i) => (
                  <tr key={i} style={{ borderBottom: i < PERMISSIONS.length - 1 ? '1px solid var(--edge)' : undefined }}>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink-2)' }}>{p.label}</td>
                    <td className="px-4 py-2.5 text-center"><Check ok={p.owner} /></td>
                    <td className="px-4 py-2.5 text-center"><Check ok={p.manager} /></td>
                    <td className="px-4 py-2.5 text-center"><Check ok={p.seller} /></td>
                    <td className="px-4 py-2.5 text-center"><Check ok={p.agent} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {active.map(u => <UserRow key={u.id} u={u} canEdit={true} />)}

        {active.length === 0 && (
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

      {inactive.length > 0 && (
        <div>
          <button
            onClick={() => setShowInactive(v => !v)}
            className="flex items-center gap-1.5 text-xs font-medium mb-2"
            style={{ color: 'var(--ink-3)' }}
          >
            {showInactive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showInactive ? 'Ocultar' : 'Ver'} inativos ({inactive.length})
          </button>
          {showInactive && (
            <div className="space-y-2">
              {inactive.map(u => <UserRow key={u.id} u={u} canEdit={true} />)}
            </div>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo colaborador" description="Escolha o tipo de acesso e preencha os dados de login.">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Tipo de acesso</label>
            <div className="grid grid-cols-2 gap-2">
              {(['manager', 'seller'] as Exclude<CollaboratorRole, 'agent'>[]).map(r => {
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
              onChange={e => setForm({ ...form, name: e.target.value })}
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
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="email@empresa.com"
              className="input-base"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              className="input-base"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={
                !form.name || !form.email || form.password.length < 6 ||
                (role !== 'agent' && !roleAvailable(role as Exclude<CollaboratorRole, 'agent'>)) ||
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
