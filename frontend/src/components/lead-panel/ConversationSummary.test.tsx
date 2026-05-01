import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConversationSummaryButton from './ConversationSummary';
import * as aiApi from '@/api/ai';

vi.mock('@/api/ai');
vi.mock('@/hooks/useFeatures', () => ({
  useFeatures: () => ({ has: (k: string) => k === 'ai_assist' }),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('<ConversationSummaryButton />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the trigger button when feature is enabled', () => {
    renderWithClient(<ConversationSummaryButton conversationId="conv-1" />);
    expect(screen.getByRole('button', { name: /resumir conversa/i })).toBeInTheDocument();
  });

  it('shows loading state while mutation is pending', async () => {
    let resolve: (v: aiApi.ConversationSummary) => void = () => undefined;
    vi.mocked(aiApi.summarizeConversation).mockImplementationOnce(
      () => new Promise((r) => { resolve = r; }),
    );

    renderWithClient(<ConversationSummaryButton conversationId="conv-1" />);
    fireEvent.click(screen.getByRole('button', { name: /resumir conversa/i }));

    await waitFor(() => expect(screen.getByText(/resumindo/i)).toBeInTheDocument());
    resolve({ summary: 'ok', cached: false, model: 'm', tokensUsed: 10 });
    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
  });

  it('renders summary text and tokens label on success', async () => {
    vi.mocked(aiApi.summarizeConversation).mockResolvedValueOnce({
      summary: 'Cliente pediu desconto. Vendedor respondeu com proposta.',
      cached: false,
      model: 'google/gemini-2.5-flash-lite',
      tokensUsed: 142,
    });

    renderWithClient(<ConversationSummaryButton conversationId="conv-1" />);
    fireEvent.click(screen.getByRole('button', { name: /resumir conversa/i }));

    await waitFor(() => expect(screen.getByText(/Cliente pediu desconto/)).toBeInTheDocument());
    expect(screen.getByText(/142 tokens/)).toBeInTheDocument();
    expect(screen.getByText(/google\/gemini-2\.5-flash-lite/)).toBeInTheDocument();
  });

  it('renders error message when API fails', async () => {
    vi.mocked(aiApi.summarizeConversation).mockRejectedValueOnce(
      Object.assign(new Error('boom'), {
        response: { data: { message: 'Limite mensal de tokens da IA atingido para este workspace.' } },
      }),
    );

    renderWithClient(<ConversationSummaryButton conversationId="conv-1" />);
    fireEvent.click(screen.getByRole('button', { name: /resumir conversa/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Limite mensal de tokens/),
    );
  });
});
