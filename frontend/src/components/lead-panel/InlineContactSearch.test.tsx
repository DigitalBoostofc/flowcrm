import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InlineContactSearch from './InlineContactSearch';
import * as contactsApi from '@/api/contacts';
import * as companiesApi from '@/api/companies';

vi.mock('@/api/contacts');
vi.mock('@/api/companies');

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const contactPage = (items: { id: string; name: string }[]) =>
  ({ items, total: items.length, limit: 10, offset: 0 }) as Awaited<ReturnType<typeof contactsApi.listContacts>>;

const companyPage = (items: { id: string; name: string }[]) =>
  ({ items, total: items.length, limit: 10, offset: 0 }) as Awaited<ReturnType<typeof companiesApi.listCompanies>>;

describe('<InlineContactSearch />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── Jornada 3 — happy path (pessoa) ─────────────────── */

  it('exibe nome atual e abre input ao clicar', async () => {
    wrap(
      <InlineContactSearch currentName="João Silva" mode="contact" onSelect={vi.fn()} />,
    );

    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('busca contatos e chama onSelect ao selecionar resultado', async () => {
    vi.mocked(contactsApi.listContacts).mockResolvedValue(
      contactPage([{ id: 'c-1', name: 'João Silva' }, { id: 'c-2', name: 'João Costa' }]),
    );
    const onSelect = vi.fn();
    wrap(<InlineContactSearch currentName="" mode="contact" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button'));
    await userEvent.type(screen.getByRole('textbox'), 'João');

    const result = await screen.findByRole('option', { name: 'João Silva' });
    await userEvent.click(result);

    expect(onSelect).toHaveBeenCalledWith('c-1', 'João Silva');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  /* ── Jornada 3 — happy path (empresa) ────────────────── */

  it('busca empresas quando mode=company', async () => {
    vi.mocked(companiesApi.listCompanies).mockResolvedValue(
      companyPage([{ id: 'co-1', name: 'Acme Ltda' }]),
    );
    const onSelect = vi.fn();
    wrap(<InlineContactSearch currentName="" mode="company" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button'));
    await userEvent.type(screen.getByRole('textbox'), 'Acme');

    await screen.findByRole('option', { name: 'Acme Ltda' });

    expect(contactsApi.listContacts).not.toHaveBeenCalled();
    expect(companiesApi.listCompanies).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('option', { name: 'Acme Ltda' }));
    expect(onSelect).toHaveBeenCalledWith('co-1', 'Acme Ltda');
  });

  /* ── Edge case: busca retorna vazio ─────────────────── */

  it('não exibe dropdown quando busca retorna lista vazia', async () => {
    vi.mocked(contactsApi.listContacts).mockResolvedValue(contactPage([]));
    wrap(<InlineContactSearch currentName="" mode="contact" onSelect={vi.fn()} />);

    await userEvent.click(screen.getByRole('button'));
    await userEvent.type(screen.getByRole('textbox'), 'xyz');

    await waitFor(() => expect(contactsApi.listContacts).toHaveBeenCalled());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  /* ── Edge case: Escape fecha sem salvar ─────────────── */

  it('fecha o input ao pressionar Escape sem chamar onSelect', async () => {
    vi.mocked(contactsApi.listContacts).mockResolvedValue(
      contactPage([{ id: 'c-1', name: 'João Silva' }]),
    );
    const onSelect = vi.fn();
    wrap(<InlineContactSearch currentName="Fulano" mode="contact" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'João');
    await screen.findByRole('option', { name: 'João Silva' });

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  /* ── Edge case: clique fora fecha sem salvar ─────────── */

  it('fecha o dropdown ao clicar fora', async () => {
    vi.mocked(contactsApi.listContacts).mockResolvedValue(
      contactPage([{ id: 'c-1', name: 'João Silva' }]),
    );
    wrap(
      <div>
        <InlineContactSearch currentName="" mode="contact" onSelect={vi.fn()} />
        <button data-testid="outside">Fora</button>
      </div>,
    );

    await userEvent.click(screen.getByRole('button', { name: /—/ }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
  });
});
