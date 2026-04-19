import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleMessage } from '@/api/scheduler';
import type { ChannelConfig } from '@/types/api';
import Modal from '@/components/ui/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  channels: ChannelConfig[];
}

function nowPlusMinutes(mins: number): string {
  const d = new Date(Date.now() + mins * 60_000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScheduleModal({ open, onClose, conversationId, channels }: Props) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [when, setWhen] = useState(() => nowPlusMinutes(60));
  const [channelId, setChannelId] = useState(channels[0]?.id ?? '');

  const mutation = useMutation({
    mutationFn: () => scheduleMessage({
      conversationId,
      body: body.trim(),
      scheduledAt: new Date(when).toISOString(),
      channelConfigId: channelId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled', conversationId] });
      setBody('');
      onClose();
    },
  });

  const disabled = !body.trim() || !channelId || !when || mutation.isPending;

  const inputStyle = {
    background: 'var(--surface-hover)',
    border: '1px solid var(--edge)',
    color: 'var(--ink-1)',
  } as const;

  return (
    <Modal open={open} onClose={onClose} title="Agendar mensagem">
      <div className="space-y-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>Data e hora</label>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>
        {channels.length > 1 && (
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>Canal</label>
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              {channels.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>Mensagem</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
            style={inputStyle}
            placeholder="Digite a mensagem a ser enviada..."
          />
        </div>
        {mutation.isError && (
          <div className="text-sm" style={{ color: 'var(--danger)' }}>Erro ao agendar mensagem</div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ color: 'var(--ink-2)', background: 'transparent' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={disabled}
            className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--brand-500)' }}
          >
            {mutation.isPending ? 'Agendando...' : 'Agendar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
