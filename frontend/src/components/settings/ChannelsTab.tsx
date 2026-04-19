import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, QrCode, Loader2, CheckCircle2, Radio, Wifi, WifiOff } from 'lucide-react';
import { listChannels, createChannel, deleteChannel, provisionChannel, getChannelQr } from '@/api/channels';
import Modal from '@/components/ui/Modal';

function randomHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function ChannelsTab() {
  const qc = useQueryClient();
  const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: listChannels });
  const [newOpen, setNewOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState<string | null>(null);
  const [initialQr, setInitialQr] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');

  const createMut = useMutation({
    mutationFn: () => createChannel({ name, type: 'uazapi', config: { webhookSecret: randomHex(16) } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['channels'] }); setNewOpen(false); setName(''); },
    onError: (err: any) => alert(err?.response?.data?.message ?? err?.message ?? 'Erro ao criar canal'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteChannel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channels'] }),
  });

  const provisionMut = useMutation({
    mutationFn: provisionChannel,
    onSuccess: (data, id) => { setInitialQr(data.qrCode); setQrOpen(id); },
    onError: (err: any) => alert(`Erro ao conectar: ${err?.response?.data?.message ?? err?.message}`),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Canais WhatsApp</h2>
          <p className="page-subtitle">Conecte seu número via QR code para enviar e receber mensagens.</p>
        </div>
        <button onClick={() => { setName(''); setNewOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Canal
        </button>
      </div>

      <div className="space-y-2">
        {channels.map(c => {
          const isConnected = c.status === 'connected';
          const isError = c.status === 'error';
          return (
            <div
              key={c.id}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', boxShadow: 'var(--shadow-md)' }}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isConnected ? 'var(--success-bg)' : 'var(--surface-hover)', border: '1px solid var(--edge)' }}
              >
                <Radio className="w-4.5 h-4.5" style={{ color: isConnected ? 'var(--success)' : 'var(--ink-3)' }} strokeWidth={1.75} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: 'var(--ink-1)' }}>{c.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isConnected
                    ? <><Wifi className="w-3 h-3" style={{ color: 'var(--success)' }} /><span className="text-xs" style={{ color: 'var(--success)' }}>Conectado</span></>
                    : isError
                    ? <><WifiOff className="w-3 h-3" style={{ color: 'var(--danger)' }} /><span className="text-xs" style={{ color: 'var(--danger)' }}>Erro</span></>
                    : <><WifiOff className="w-3 h-3" style={{ color: 'var(--ink-3)' }} /><span className="text-xs" style={{ color: 'var(--ink-3)' }}>Desconectado</span></>
                  }
                  <span style={{ color: 'var(--edge-strong)' }}>·</span>
                  <span className="text-xs" style={{ color: 'var(--ink-3)' }}>WhatsApp via QR</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => provisionMut.mutate(c.id)}
                  disabled={provisionMut.isPending && provisionMut.variables === c.id}
                  className="btn-secondary text-xs"
                  style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                >
                  {provisionMut.isPending && provisionMut.variables === c.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <QrCode className="w-3.5 h-3.5" strokeWidth={2} />
                  }
                  {isConnected ? 'Reconectar' : 'Conectar'}
                </button>
                <button
                  onClick={() => confirm(`Excluir canal "${c.name}"?`) && deleteMut.mutate(c.id)}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--ink-3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          );
        })}

        {channels.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-12 rounded-xl text-center"
            style={{ background: 'var(--surface)', border: '1px dashed var(--edge-strong)' }}
          >
            <Radio className="w-8 h-8 mb-3" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
            <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Nenhum canal cadastrado</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>Crie um canal e conecte seu WhatsApp via QR code</p>
          </div>
        )}
      </div>

      {/* Modal novo canal */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Novo canal WhatsApp" description="Após criar, clique em Conectar para vincular seu número via QR code.">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Nome do canal</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: WhatsApp Principal"
              className="input-base"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setNewOpen(false)} className="btn-ghost">Cancelar</button>
            <button
              onClick={() => createMut.mutate()}
              disabled={!name || createMut.isPending}
              className="btn-primary"
            >
              {createMut.isPending ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>

      <QrModal
        channelId={qrOpen}
        initialQr={initialQr}
        onClose={() => { setQrOpen(null); setInitialQr(undefined); }}
      />
    </div>
  );
}

function QrModal({ channelId, initialQr, onClose }: { channelId: string | null; initialQr?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [qr, setQr] = useState<string | null>(initialQr ?? null);
  const [connected, setConnected] = useState(false);
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!channelId) { setQr(null); setConnected(false); setPhone(''); return; }
    if (initialQr) setQr(initialQr);
    let cancelled = false;

    const poll = async () => {
      try {
        const result = await getChannelQr(channelId);
        if (cancelled) return false;
        if (result.connected) {
          setConnected(true);
          setPhone(result.phone ?? '');
          qc.invalidateQueries({ queryKey: ['channels'] });
          return true;
        }
        if (result.base64) setQr(result.base64);
      } catch {}
      return false;
    };

    const first = setTimeout(poll, 4000);
    const t = setInterval(async () => {
      const done = await poll();
      if (done) clearInterval(t);
    }, 4000);

    return () => { cancelled = true; clearTimeout(first); clearInterval(t); };
  }, [channelId, initialQr, qc]);

  if (!channelId) return null;

  const imgSrc = qr ? (qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`) : '';

  if (connected) {
    return (
      <Modal open onClose={onClose} title="WhatsApp conectado!">
        <div className="text-center space-y-4 py-2">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'var(--success-bg)' }}
          >
            <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <p className="font-semibold text-base" style={{ color: 'var(--ink-1)' }}>Número conectado com sucesso!</p>
            {phone && <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>+{phone}</p>}
          </div>
          <button onClick={onClose} className="btn-primary mx-auto">Fechar</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Conectar WhatsApp" description="Abra o WhatsApp → Dispositivos conectados → Conectar um dispositivo">
      <div className="text-center space-y-4">
        {imgSrc ? (
          <img src={imgSrc} alt="QR Code" className="w-60 h-60 mx-auto rounded-xl p-2 bg-white" style={{ border: '1px solid var(--edge)' }} />
        ) : (
          <div className="flex flex-col items-center gap-3 py-10" style={{ color: 'var(--ink-3)' }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-500)' }} />
            <span className="text-sm">Gerando QR code...</span>
          </div>
        )}
        {imgSrc && <p className="text-xs" style={{ color: 'var(--ink-3)' }}>QR atualiza automaticamente a cada 5s</p>}
      </div>
    </Modal>
  );
}
