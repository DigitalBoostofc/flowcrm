import { useState } from 'react';
import { Send, Calendar } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage } from '@/api/messages';
import type { ChannelConfig } from '@/types/api';
import ScheduleModal from './ScheduleModal';

interface Props {
  conversationId: string;
  channels: ChannelConfig[];
}

export default function MessageComposer({ conversationId, channels }: Props) {
  const [body, setBody] = useState('');
  const [channelId, setChannelId] = useState<string>(channels[0]?.id ?? '');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => sendMessage({ conversationId, channelConfigId: channelId, body: body.trim() }),
    onSuccess: () => {
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  const disabled = !body.trim() || !channelId || mutation.isPending;

  return (
    <>
      <div className="p-3" style={{ borderTop: '1px solid var(--edge)', background: 'var(--surface)' }}>
        {channels.length > 1 && (
          <select
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="mb-2 w-full rounded-lg px-2 py-1.5 text-xs outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
          >
            {channels.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        )}
        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!disabled) mutation.mutate();
              }
            }}
            placeholder="Digite uma mensagem..."
            rows={2}
            className="flex-1 rounded-xl px-3 py-2 text-sm resize-none outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
          />
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => mutation.mutate()}
              disabled={disabled}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--brand-500)' }}
              title="Enviar agora"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={() => setScheduleOpen(true)}
              disabled={channels.length === 0}
              className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-colors"
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
              title="Agendar envio"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>
        {channels.length === 0 && (
          <div className="text-xs mt-2" style={{ color: 'var(--warning)' }}>
            Nenhum canal configurado. Vá em Configurações → Canais.
          </div>
        )}
      </div>
      <ScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        conversationId={conversationId}
        channels={channels}
      />
    </>
  );
}
