import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, QrCode, Loader2 } from 'lucide-react';
import { listChannels, createChannel, deleteChannel, provisionChannel, getChannelQr } from '@/api/channels';
import Modal from '@/components/ui/Modal';

type ChannelKind = 'uazapi' | 'meta';

function randomHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function channelLabel(type: string): string {
  if (type === 'uazapi') return 'WhatsApp via QR (uazapiGO)';
  if (type === 'evolution') return 'WhatsApp via QR (Evolution)';
  return 'WhatsApp Business API (Meta oficial)';
}

function isQrChannel(type: string): boolean {
  return type === 'uazapi' || type === 'evolution';
}

export default function ChannelsTab() {
  const queryClient = useQueryClient();
  const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: listChannels });
  const [newOpen, setNewOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState<string | null>(null);

  const [kind, setKind] = useState<ChannelKind>('uazapi');
  const [name, setName] = useState('');
  // meta fields
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const resetForm = () => {
    setKind('uazapi');
    setName('');
    setPhoneNumberId('');
    setAccessToken('');
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const config: Record<string, string> =
        kind === 'uazapi'
          ? { webhookSecret: randomHex(16) }
          : { phoneNumberId, accessToken };
      return createChannel({ name, type: kind, config });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      setNewOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChannel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  });

  const provisionMutation = useMutation({
    mutationFn: provisionChannel,
    onSuccess: (_, id) => setQrOpen(id),
  });

  const isFormValid =
    !!name &&
    (kind === 'uazapi' || (!!phoneNumberId && !!accessToken));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Canais</h3>
        <button
          onClick={() => { resetForm(); setNewOpen(true); }}
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
                <span className="capitalize">{channelLabel(c.type)}</span>
                {' • '}
                <span className={c.status === 'connected' ? 'text-emerald-400' : c.status === 'error' ? 'text-red-400' : 'text-amber-400'}>
                  {c.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {isQrChannel(c.type) && (
                <button
                  onClick={() => provisionMutation.mutate(c.id)}
                  disabled={provisionMutation.isPending && provisionMutation.variables === c.id}
                  className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm px-3 py-1.5 rounded-lg disabled:opacity-60"
                  title="Conectar WhatsApp via QR"
                >
                  {provisionMutation.isPending && provisionMutation.variables === c.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <QrCode className="w-4 h-4" />}
                  Conectar
                </button>
              )}
              <button
                onClick={() => confirm(`Excluir canal ${c.name}?`) && deleteMutation.mutate(c.id)}
                className="text-slate-500 hover:text-red-400 p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {channels.length === 0 && <div className="text-sm text-slate-500">Nenhum canal cadastrado</div>}
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Novo canal">
        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Tipo de conexão</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind('uazapi')}
                className={`text-left rounded-lg border p-3 transition ${
                  kind === 'uazapi'
                    ? 'border-brand-500 bg-brand-600/10'
                    : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                }`}
              >
                <div className="text-sm font-medium text-slate-100">WhatsApp via QR</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Conecte qualquer número escaneando o QR code
                </div>
              </button>
              <button
                type="button"
                onClick={() => setKind('meta')}
                className={`text-left rounded-lg border p-3 transition ${
                  kind === 'meta'
                    ? 'border-brand-500 bg-brand-600/10'
                    : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                }`}
              >
                <div className="text-sm font-medium text-slate-100">WhatsApp Business API</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Oficial (Meta) — requer número verificado
                </div>
              </button>
            </div>
          </div>

          {/* Nome do canal (comum a todos) */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Nome do canal</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: WhatsApp Principal"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
            />
          </div>

          {/* uazapi: nenhum campo extra */}
          {kind === 'uazapi' && (
            <p className="text-xs text-slate-500 leading-relaxed bg-slate-900 rounded-lg px-3 py-2">
              Após criar, clique em <strong className="text-slate-300">Conectar</strong> para gerar o QR code.
              Abra o WhatsApp no celular e escaneie para vincular o número.
            </p>
          )}

          {/* Meta fields */}
          {kind === 'meta' && (
            <>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Phone Number ID</label>
                <input
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="ID do número em business.facebook.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Access Token (permanente)</label>
                <input
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="EAAG... (token do System User)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                O webhook do Meta deve apontar para <code className="text-slate-400">/api/webhooks/meta</code>.
              </p>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setNewOpen(false)} className="px-3 py-1.5 text-sm text-slate-400">
              Cancelar
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!isFormValid || createMutation.isPending}
              className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg"
            >
              {createMutation.isPending ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>

      <QrModal channelId={qrOpen} onClose={() => setQrOpen(null)} />
    </div>
  );
}

function QrModal({ channelId, onClose }: { channelId: string | null; onClose: () => void }) {
  const [qr, setQr] = useState<{ base64: string } | null>(null);

  useEffect(() => {
    if (!channelId) { setQr(null); return; }
    let cancelled = false;
    const fetchQr = async () => {
      try {
        const result = await getChannelQr(channelId);
        if (!cancelled) setQr(result);
      } catch {}
    };
    fetchQr();
    const t = setInterval(fetchQr, 8000);
    return () => { cancelled = true; clearInterval(t); };
  }, [channelId]);

  if (!channelId) return null;

  const imgSrc = qr?.base64
    ? qr.base64.startsWith('data:') ? qr.base64 : `data:image/png;base64,${qr.base64}`
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
