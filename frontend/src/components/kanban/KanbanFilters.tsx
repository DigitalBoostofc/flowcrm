import { Search } from 'lucide-react';
import type { User } from '@/types/api';

interface Props {
  search: string;
  setSearch: (v: string) => void;
  agentId: string | null;
  setAgentId: (v: string | null) => void;
  agents: User[];
}

export default function KanbanFilters({ search, setSearch, agentId, setAgentId, agents }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
        />
      </div>
      <select
        value={agentId ?? ''}
        onChange={(e) => setAgentId(e.target.value || null)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
      >
        <option value="">Todos os agentes</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    </div>
  );
}
