import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, X } from 'lucide-react';
import { summarizeConversation, type ConversationSummary } from '@/api/ai';
import { useFeatures } from '@/hooks/useFeatures';

interface Props {
  conversationId: string;
}

export default function ConversationSummaryButton({ conversationId }: Props) {
  const features = useFeatures();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [result, setResult] = useState<ConversationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => summarizeConversation(conversationId),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      setOpen(true);
      setCollapsed(false);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : 'Falha ao gerar resumo.');
      setError(message);
      setOpen(true);
    },
  });

  if (!features.has('ai_assist')) return null;

  return (
    <div
      className="px-3 py-2 flex-shrink-0"
      style={{ borderBottom: '1px solid var(--edge)', background: 'var(--surface)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors disabled:opacity-60"
          style={{ background: 'var(--surface)', color: 'var(--ink-1)', borderColor: 'var(--edge)' }}
          title="Resumir esta conversa com IA"
        >
          {mutation.isPending ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          <span>{mutation.isPending ? 'Resumindo…' : open ? 'Atualizar resumo' : 'Resumir conversa'}</span>
        </button>

        {open && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="p-1 rounded hover:bg-[var(--canvas)]"
              title={collapsed ? 'Expandir' : 'Recolher'}
            >
              {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setResult(null);
                setError(null);
              }}
              className="p-1 rounded hover:bg-[var(--canvas)]"
              title="Fechar"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {open && !collapsed && (
        <div
          className="mt-2 p-2.5 rounded-md text-xs leading-relaxed"
          style={{ background: 'var(--canvas)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
        >
          {error && (
            <div role="alert" style={{ color: 'var(--danger, #b91c1c)' }}>
              {error}
            </div>
          )}
          {!error && result && (
            <>
              <div className="whitespace-pre-wrap break-words">{result.summary}</div>
              <div className="mt-2 text-[10px]" style={{ color: 'var(--ink-3)' }}>
                {result.cached ? 'Em cache' : `IA · ${result.tokensUsed} tokens`} · {result.model}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
