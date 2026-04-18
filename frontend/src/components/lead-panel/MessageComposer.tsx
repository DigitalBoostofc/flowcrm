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
      <div className="p-3 border-t border-slate-700 bg-slate-800">
        {channels.length > 1 && (
          <select
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="mb-2 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
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
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 resize-none focus:outline-none focus:border-brand-500"
          />
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => mutation.mutate()}
              disabled={disabled}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg flex items-center justify-center"
              title="Enviar agora"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={() => setScheduleOpen(true)}
              disabled={channels.length === 0}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 px-3 py-1.5 rounded-lg flex items-center justify-center"
              title="Agendar envio"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>
        {channels.length === 0 && (
          <div className="text-xs text-yellow-500 mt-2">Nenhum canal configurado. Vá em Configurações → Canais.</div>
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
