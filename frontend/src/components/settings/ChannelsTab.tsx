import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, QrCode } from 'lucide-react';
import { listChannels, createChannel, deleteChannel, provisionChannel, getChannelQr } from '@/api/channels';
import Modal from '@/components/ui/Modal';

type ChannelKind = 'evolution' | 'meta';

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

  const [kind, setKind] = useState<ChannelKind>('evolution');
  const [name, setName] = useState('');
  // evolution fields
  const [instance, setInstance] = useState('');
  const [evolutionApiKey, setEvolutionApiKey] = useState('');
  // meta fields
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const resetForm = () => {
    setKind('evolution');
    setName('');
    setInstance('');
    setEvolutionApiKey('');
    setPhoneNumberId('');
    setAccessToken('');
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const config: Record<string, string> =
        kind === 'evolution'
          ? { instance, apiKey: evolutionApiKey, webhookSecret: randomHex(16) }
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
    (kind === 'evolution'
      ? !!instance && !!evolutionApiKey
      : !!phoneNumberId && !!accessToken);

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
                <span className="capitalize">
                  {c.type === 'evolution' ? 'WhatsApp via QR (Evolution)' : 'WhatsApp Business API (Meta oficial)'}
                </span>
                {' • '}
                <span className={c.status === 'connected' ? 'text-emerald-400' : c.status === 'error' ? 'text-red-400' : 'text-amber-400'}>
                  {c.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {c.type === 'evolution' && (
                <button
                  onClick={() => provisionMutation.mutate(c.id)}
                  disabled={provisionMutation.isPending}
                  className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm px-3 py-1.5 rounded-lg"
                  title="Conectar WhatsApp via QR"
                >
                  <QrCode className="w-4 h-4" /> Conectar
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
                onClick={() => setKind('evolution')}
                className={`text-left rounded-lg border p-3 transition ${
                  kind === 'evolution'
                    ? 'border-brand-500 bg-brand-600/10'
                    : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                }`}
              >
                <div className="text-sm font-medium text-slate-100">WhatsApp via QR</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Não-oficial (Evolution/Baileys) — lê QR code no celular
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
                  Oficial (Meta) — requer número verificado e conta de desenvolvedor
                </div>
              </button>
            </div>
          </div>

          {/* Common */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Nome do canal</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: WhatsApp Principal"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
            />
          </div>

          {/* Evolution fields */}
          {kind === 'evolution' && (
            <>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nome da instância no Evolution</label>
                <input
                  value={instance}
                  onChange={(e) => setInstance(e.target.value)}
                  placeholder="Ex: flowcrm-main"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">API key global do Evolution</label>
                <input
                  value={evolutionApiKey}
                  onChange={(e) => setEvolutionApiKey(e.target.value)}
                  placeholder="apikey do servidor Evolution"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </>
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
                As variáveis <code className="text-slate-400">META_VERIFY_TOKEN</code> e{' '}
                <code className="text-slate-400">META_APP_SECRET</code> precisam estar configuradas no servidor.
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
              Criar
            </button>
          </div>
        </div>
      </Modal>

      <QrModal channelId={qrOpen} onClose={() => setQrOpen(null)} />
    </div>
  );
}

function QrModal({ channelId, onClose }: { channelId: string | null; onClose: () => void }) {
  const [qr, setQr] = useState<{ base64: string; pairingCode?: string } | null>(null);

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
    const t = setInterval(fetchQr, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, [channelId]);

  if (!channelId) return null;

  const imgSrc = qr?.base64
    ? qr.base64.startsWith('data:') ? qr.base64 : `data:image/png;base64,${qr.base64}`
    : '';

  return (
    <Modal open={!!channelId} onClose={onClose} title="Conectar WhatsApp">
      <div className="text-center space-y-3">
        <p className="text-sm text-slate-400">Abra WhatsApp → Dispositivos conectados → Conectar um dispositivo</p>
        {imgSrc ? (
          <img src={imgSrc} alt="QR Code" className="w-64 h-64 mx-auto bg-white rounded-lg p-2" />
        ) : (
          <div className="text-slate-500 py-12">Gerando QR...</div>
        )}
        <p className="text-xs text-slate-500">O QR atualiza a cada 15s</p>
      </div>
    </Modal>
  );
}
