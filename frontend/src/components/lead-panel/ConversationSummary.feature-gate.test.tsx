import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConversationSummaryButton from './ConversationSummary';

vi.mock('@/api/ai');
vi.mock('@/hooks/useFeatures', () => ({
  useFeatures: () => ({ has: () => false }),
}));

describe('<ConversationSummaryButton /> feature gate', () => {
  it('renders nothing when ai_assist feature is missing', () => {
    const client = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={client}>
        <ConversationSummaryButton conversationId="conv-1" />
      </QueryClientProvider>,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('button', { name: /resumir/i })).toBeNull();
  });
});
