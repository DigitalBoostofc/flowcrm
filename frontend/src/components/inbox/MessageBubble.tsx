import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Mic, File, Video, FileText, Check, CheckCheck,
  SmilePlus, Trash2, X, Loader2,
} from 'lucide-react';
import { reactMessage, transcribeAudio } from '@/api/messages';
import type { Message } from '@/types/api';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageBubble({ message, isOut, channelId, onDelete }: {
  message: Message;
  isOut: boolean;
  channelId: string;
  onDelete: (m: Message) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const reactMut = useMutation({
    mutationFn: (emoji: string) =>
      reactMessage({ messageId: message.externalMessageId ?? message.id, channelConfigId: channelId, emoji }),
  });

  async function handleTranscribe() {
    if (!message.mediaUrl || isTranscribing) return;
    setIsTranscribing(true);
    try {
      const text = await transcribeAudio(message.mediaUrl);
      setTranscript(text);
    } catch {
      setTranscript('Não foi possível transcrever o áudio.');
    } finally {
      setIsTranscribing(false);
    }
  }

  const bubbleStyle = isOut
    ? { background: 'var(--brand-500)', color: '#fff', borderBottomRightRadius: 4 }
    : { background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)', borderBottomLeftRadius: 4 };

  function renderContent() {
    if (message.type === 'deleted') {
      return <em className="text-sm opacity-60">Mensagem apagada</em>;
    }
    if (message.type === 'image') {
      return (
        <div>
          {message.mediaUrl ? (
            <a href={message.mediaUrl} target="_blank" rel="noreferrer">
              <img
                src={message.mediaUrl}
                alt={message.mediaCaption ?? 'Imagem'}
                className="max-w-[240px] rounded-lg object-cover"
                style={{ maxHeight: 200 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </a>
          ) : (
            <div className="flex items-center gap-2 py-1 opacity-60">
              <File className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
              <span className="text-sm">Imagem</span>
            </div>
          )}
          {message.mediaCaption && <p className="text-sm mt-1 leading-relaxed">{message.mediaCaption}</p>}
        </div>
      );
    }
    if (message.type === 'video') {
      return (
        <div>
          {message.mediaUrl ? (
            <video controls src={message.mediaUrl} className="max-w-[240px] rounded-lg" style={{ maxHeight: 200 }} />
          ) : (
            <div className="flex items-center gap-2 py-1 opacity-60">
              <Video className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
              <span className="text-sm">Vídeo</span>
            </div>
          )}
          {message.mediaCaption && <p className="text-sm mt-1">{message.mediaCaption}</p>}
        </div>
      );
    }
    if (message.type === 'audio') {
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 py-1">
            <Mic className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
            {message.mediaUrl ? (
              <audio controls src={message.mediaUrl} className="h-8" style={{ minWidth: 160 }} />
            ) : (
              <span className="text-sm opacity-60">Áudio</span>
            )}
            {!isOut && message.mediaUrl && (
              <button
                onClick={handleTranscribe}
                disabled={isTranscribing}
                title="Transcrever áudio"
                className="p-1 rounded-lg flex-shrink-0 disabled:opacity-50 transition-opacity hover:opacity-70"
                style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
              >
                {isTranscribing
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <FileText className="w-3.5 h-3.5" />
                }
              </button>
            )}
          </div>
          {transcript && (
            <p className="text-xs italic leading-relaxed px-1" style={{ color: 'var(--ink-2)' }}>
              {transcript}
            </p>
          )}
        </div>
      );
    }
    if (message.type === 'sticker') {
      return message.mediaUrl ? (
        <img
          src={message.mediaUrl}
          alt="Sticker"
          className="max-w-[120px] rounded-lg"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <span className="text-sm opacity-60">🎭 Sticker</span>
      );
    }
    if (message.type === 'document') {
      return (
        <a
          href={message.mediaUrl ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 hover:opacity-80"
        >
          <File className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
          <div className="text-sm">
            <p className="font-medium leading-tight truncate max-w-[200px]">
              {message.mediaFileName ?? 'Documento'}
            </p>
            {message.mediaMimeType && (
              <p className="text-xs opacity-60">{message.mediaMimeType}</p>
            )}
          </div>
        </a>
      );
    }
    return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>;
  }

  function renderStatus() {
    if (!isOut) return null;
    const s = message.status;
    if (s === 'read') return <CheckCheck className="w-3 h-3" style={{ color: '#93c5fd' }} />;
    if (s === 'delivered') return <CheckCheck className="w-3 h-3 opacity-60" />;
    if (s === 'sent') return <Check className="w-3 h-3 opacity-60" />;
    return null;
  }

  return (
    <div
      className={`flex ${isOut ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmojis(false); }}
    >
      <div className="relative max-w-[70%]">
        {hovered && message.type !== 'deleted' && channelId && (
          <div
            className={`absolute top-0 flex items-center gap-1 z-10 ${isOut ? 'right-full mr-1' : 'left-full ml-1'}`}
          >
            {showEmojis ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-xl shadow-lg border"
                style={{ background: 'var(--surface)', borderColor: 'var(--edge)' }}>
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => { reactMut.mutate(emoji); setShowEmojis(false); }}
                    className="text-base hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
                <button onClick={() => setShowEmojis(false)}>
                  <X className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowEmojis(true)}
                  title="Reagir"
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-80"
                  style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                >
                  <SmilePlus className="w-3.5 h-3.5" style={{ color: 'var(--ink-2)' }} />
                </button>
                {isOut && (
                  <button
                    onClick={() => onDelete(message)}
                    title="Apagar"
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-80"
                    style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--danger, #ef4444)' }} />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <div className="px-3 py-2 rounded-2xl" style={bubbleStyle}>
          {renderContent()}
          <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-end' : ''}`}>
            <p className={`text-[10px] ${isOut ? 'text-white/60' : ''}`} style={!isOut ? { color: 'var(--ink-3)' } : {}}>
              {new Date(message.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {renderStatus()}
          </div>
        </div>
      </div>
    </div>
  );
}
