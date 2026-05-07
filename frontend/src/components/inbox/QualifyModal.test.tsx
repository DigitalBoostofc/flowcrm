import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QualifyModal from './QualifyModal';
import * as pipelinesApi from '@/api/pipelines';
import * as usersApi from '@/api/users';
import type { InboxItem } from '@/api/conversations';
import type { Pipeline } from '@/types/api';

vi.mock('@/api/pipelines');
vi.mock('@/api/users');
vi.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({ user: { id: 'me-1', name: 'Leo' } }),
}));

const mockItem: InboxItem = {
  id: 'conv-1',
  leadId: null,
  channelType: 'whatsapp',
  externalId: '5511999999999',
  contactId: null,
  contactName: 'Maria Souza',
  fromName: null,
  contactPhone: '11999999999',
  contactCategoria: null,
  contactAvatarUrl: null,
  fromAvatarUrl: null,
  lastMessageBody: 'Olá',
  lastMessageDirection: 'inbound',
  lastMessageSentAt: new Date().toISOString(),
  unread: true,
  updatedAt: new Date().toISOString(),
  pendingClassification: true,
  assignedToName: null,
  labels: [],
};

const mockPipelines: Pipeline[] = [
  {
    id: 'pipe-1',
    name: 'Vendas',
    isDefault: true,
    kind: 'sale',
    createdAt: '',
    updatedAt: '',
    stages: [
      { id: 'stage-1', name: 'Prospecção', position: 1, color: '#6366f1', pipelineId: 'pipe-1', createdAt: '' },
      { id: 'stage-2', name: 'Proposta', position: 2, color: '#8b5cf6', pipelineId: 'pipe-1', createdAt: '' },
    ],
  },
  {
    id: 'pipe-2',
    name: 'Suporte',
    isDefault: false,
    kind: 'sale',
    createdAt: '',
    updatedAt: '',
    stages: [
      { id: 'stage-3', name: 'Aberto', position: 1, color: '#ec4899', pipelineId: 'pipe-2', createdAt: '' },
    ],
  },
];

const mockMembers = [
  { id: 'me-1', name: 'Leo' },
  { id: 'user-2', name: 'Ana' },
];

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('<QualifyModal />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pipelinesApi.listPipelines).mockResolvedValue(mockPipelines);
    vi.mocked(usersApi.listWorkspaceMembers).mockResolvedValue(mockMembers);
  });

  /* ── Renderização inicial ────────────────────────────── */

  it('renderiza com heading e nome do contato pré-preenchido', async () => {
    wrap(<QualifyModal item={mockItem} onConfirm={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('Qualificar contato')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByDisplayValue('Maria Souza')).toBeInTheDocument(),
    );
  });

  it('seleciona o primeiro pipeline padrão e primeira etapa automaticamente', async () => {
    wrap(<QualifyModal item={mockItem} onConfirm={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() =>
      expect((screen.getByDisplayValue('Vendas') as HTMLSelectElement).value).toBe('pipe-1'),
    );
    expect((screen.getByDisplayValue('Prospecção') as HTMLSelectElement).value).toBe('stage-1');
  });

  /* ── Jornada 1 — happy path ──────────────────────────── */

  it('chama onConfirm com payload correto ao submeter', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    wrap(<QualifyModal item={mockItem} onConfirm={onConfirm} onClose={vi.fn()} />);

    await waitFor(() => screen.getByDisplayValue('Vendas'));

    // Trocar tipo para Empresa
    await userEvent.click(screen.getByRole('button', { name: /empresa/i }));

    // Responsável já pré-selecionado como "me" — verificar e confirmar
    await userEvent.click(screen.getByRole('button', { name: /qualificar/i }));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith({
        name: 'Maria Souza',
        type: 'company',
        pipelineId: 'pipe-1',
        stageId: 'stage-1',
        assignedToId: 'me-1',
      }),
    );
  });

  /* ── Jornada 2 — criação de negócio: payload completo ─── */

  it('inclui pipelineId e stageId escolhidos no payload enviado', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    wrap(<QualifyModal item={mockItem} onConfirm={onConfirm} onClose={vi.fn()} />);

    await waitFor(() => screen.getByDisplayValue('Vendas'));

    // Trocar para segunda etapa
    await userEvent.selectOptions(screen.getByDisplayValue('Prospecção'), 'stage-2');

    await userEvent.click(screen.getByRole('button', { name: /qualificar/i }));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ pipelineId: 'pipe-1', stageId: 'stage-2' }),
      ),
    );
  });

  /* ── Edge case: validação — nome vazio ───────────────── */

  it('bloqueia submit sem nome e exibe mensagem de erro', async () => {
    const onConfirm = vi.fn();
    wrap(<QualifyModal item={{ ...mockItem, contactName: null }} onConfirm={onConfirm} onClose={vi.fn()} />);

    await waitFor(() => screen.getByDisplayValue('Vendas'));

    const nameInput = screen.getByPlaceholderText(/João Silva/i);
    await userEvent.clear(nameInput);

    await userEvent.click(screen.getByRole('button', { name: /qualificar/i }));

    expect(screen.getByText('Informe o nome.')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  /* ── Edge case: validação — responsável vazio ────────── */

  it('bloqueia submit sem responsável e exibe mensagem de erro', async () => {
    const onConfirm = vi.fn();
    wrap(<QualifyModal item={mockItem} onConfirm={onConfirm} onClose={vi.fn()} />);

    await waitFor(() => screen.getByDisplayValue('Vendas'));

    await userEvent.selectOptions(
      screen.getByDisplayValue(/Eu \(Leo\)/),
      '',
    );

    await userEvent.click(screen.getByRole('button', { name: /qualificar/i }));

    expect(screen.getByText('Selecione o responsável.')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  /* ── Edge case: erro de API ──────────────────────────── */

  it('exibe mensagem de erro e reabilita botão quando API falha', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('500'));
    wrap(<QualifyModal item={mockItem} onConfirm={onConfirm} onClose={vi.fn()} />);

    await waitFor(() => screen.getByDisplayValue('Vendas'));

    await userEvent.click(screen.getByRole('button', { name: /qualificar/i }));

    await waitFor(() =>
      expect(screen.getByText('Erro ao qualificar. Tente novamente.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /qualificar/i })).not.toBeDisabled();
  });

  /* ── Edge case: troca de pipeline reseta stages ──────── */

  it('reseta stages para a primeira etapa do novo pipeline ao trocar funil', async () => {
    wrap(<QualifyModal item={mockItem} onConfirm={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => screen.getByDisplayValue('Vendas'));

    await userEvent.selectOptions(screen.getByDisplayValue('Vendas'), 'pipe-2');

    await waitFor(() =>
      expect((screen.getByDisplayValue('Aberto') as HTMLSelectElement).value).toBe('stage-3'),
    );
    expect(screen.queryByText('Prospecção')).not.toBeInTheDocument();
  });

  /* ── Edge case: fechar modal ─────────────────────────── */

  it('chama onClose ao clicar em Cancelar', async () => {
    const onClose = vi.fn();
    wrap(<QualifyModal item={mockItem} onConfirm={vi.fn()} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
