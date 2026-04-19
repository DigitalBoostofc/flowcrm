import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, QrCode, Loader2 } from 'lucide-react';
import { listChannels, createChannel, deleteChannel, provisionChannel, getChannelQr } from '@/api/channels';
import Modal from '@/components/ui/Modal';

function randomHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function ChannelsTab() {
  const queryClient = useQueryClient();
  const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: listChannels });
  const [newOpen, setNewOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState<string | null>(null);
  const [initialQr, setInitialQr] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      createChannel({ name, type: 'uazapi', config: { webhookSecret: randomHex(16) } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      setNewOpen(false);
      setName('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Erro ao criar canal';
      alert(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChannel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  });

  const provisionMutation = useMutation({
    mutationFn: provisionChannel,
    onSuccess: (data, id) => {
      setInitialQr(data.qrCode);
      setQrOpen(id);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Erro desconhecido';
      alert(`Erro ao conectar: ${msg}`);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Canais</h3>
        <button
          onClick={() => { setName(''); setNewOpen(true); }}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm px-3 py-1.5 rounded-lg"
        >
          <Plus className="w-4 h-4" /> Novo Canal
        </button>
      </div>

      <div className="space-y-2">
        {channels.map((c) => (
          <div key={c.id} className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-100">{c.name}</div>
              <div className="text-xs text-slate-500">
                WhatsApp via QR
                {' • '}
                <span className={
                  c.status === 'connected' ? 'text-emerald-400' :
                  c.status === 'error' ? 'text-red-400' : 'text-amber-400'
                }>
                  {c.status === 'connected' ? 'conectado' : c.status === 'disconnected' ? 'desconectado' : c.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => provisionMutation.mutate(c.id)}
                disabled={provisionMutation.isPending && provisionMutation.variables === c.id}
                className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm px-3 py-1.5 rounded-lg disabled:opacity-60"
              >
                {provisionMutation.isPending && provisionMutation.variables === c.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <QrCode className="w-4 h-4" />}
                Conectar
              </button>
              <button
                onClick={() => confirm(`Excluir canal "${c.name}"?`) && deleteMutation.mutate(c.id)}
                className="text-slate-500 hover:text-red-400 p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {channels.length === 0 && (
          <div className="text-sm text-slate-500">Nenhum canal cadastrado</div>
        )}
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Novo canal WhatsApp">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Nome do canal</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: WhatsApp Principal"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed bg-slate-900 rounded-lg px-3 py-2">
            Após criar, clique em <strong className="text-slate-300">Conectar</strong> para gerar o QR code
            e vincular o número do WhatsApp.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setNewOpen(false)} className="px-3 py-1.5 text-sm text-slate-400">
              Cancelar
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!name || createMutation.isPending}
              className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg"
            >
              {createMutation.isPending ? 'Criando...' : 'Criar'}
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
  const [qr, setQr] = useState<string | null>(initialQr ?? null);

  useEffect(() => {
    if (!channelId) { setQr(null); return; }
    if (initialQr) setQr(initialQr);
    let cancelled = false;
    const fetchQr = async () => {
      try {
        const result = await getChannelQr(channelId);
        if (!cancelled && result.base64) setQr(result.base64);
      } catch {}
    };
    const first = setTimeout(fetchQr, 5000);
    const t = setInterval(fetchQr, 8000);
    return () => { cancelled = true; clearTimeout(first); clearInterval(t); };
  }, [channelId, initialQr]);

  if (!channelId) return null;

  const imgSrc = qr
    ? qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`
    : '';

  return (
    <Modal open={!!channelId} onClose={onClose} title="Conectar WhatsApp">
      <div className="text-center space-y-4">
        <p className="text-sm text-slate-400">
          Abra o WhatsApp → <strong>Dispositivos conectados</strong> → <strong>Conectar um dispositivo</strong>
        </p>
        {imgSrc ? (
          <img src={imgSrc} alt="QR Code" className="w-64 h-64 mx-auto bg-white rounded-xl p-2" />
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <span className="text-sm">Gerando QR code...</span>
          </div>
        )}
        {imgSrc && <p className="text-xs text-slate-500">QR atualiza automaticamente a cada 8s</p>}
      </div>
    </Modal>
  );
}
