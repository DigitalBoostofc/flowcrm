import { Body, Controller, Logger, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { ChannelsService } from '../channels.service';
import { UazapiAdapter } from './uazapi.adapter';
import { ApiTags } from '@nestjs/swagger';
import type { MessageType } from '../../messages/entities/message.entity';

function timingSafeStringEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

const MEDIA_TYPES: Record<string, MessageType> = {
  // Formas longas (nomes proto do WhatsApp)
  imageMessage: 'image',
  videoMessage: 'video',
  audioMessage: 'audio',
  pttMessage: 'audio',
  documentMessage: 'document',
  stickerMessage: 'sticker',
  // Formas curtas (uazapGO simplificado)
  image: 'image',
  video: 'video',
  audio: 'audio',
  ptt: 'audio',
  document: 'document',
  sticker: 'sticker',
};

// Tipos sem conteúdo útil para exibir — ignorar silenciosamente
const IGNORED_TYPES = new Set([
  'reaction', 'reactionMessage',
  'protocolMessage', 'senderKeyDistributionMessage',
  'readReceiptMessage', 'callLogMessage',
]);

// Placeholder de body para tipos especiais sem texto
const BODY_PLACEHOLDER: Record<string, string> = {
  location: '[Localização]',
  locationMessage: '[Localização]',
  liveLocationMessage: '[Localização ao vivo]',
  contactMessage: '[Contato]',
  contact: '[Contato]',
  pollMessage: '[Enquete]',
  poll: '[Enquete]',
};

@ApiTags('uazapi-webhook')
@Controller('webhooks/uazapi')
export class UazapiWebhookController {
  private logger = new Logger(UazapiWebhookController.name);

  constructor(
    private channels: ChannelsService,
    private events: EventEmitter2,
    private uazapi: UazapiAdapter,
  ) {}

  @Post(':channelConfigId/:secret')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async receive(
    @Param('channelConfigId') channelConfigId: string,
    @Param('secret') secret: string,
    @Body() payload: any,
  ) {
    const channel = await this.channels.findByIdUnscoped(channelConfigId);
    if (!channel || !timingSafeStringEqual(secret ?? '', channel.config?.webhookSecret ?? '')) {
      this.logger.warn(`Webhook não autorizado para canal ${channelConfigId}`);
      throw new UnauthorizedException();
    }

    const eventType: string = payload?.EventType ?? payload?.event ?? '';
    this.logger.log(`webhook received for ${channelConfigId}: event=${eventType || 'unknown'}`);

    if (eventType === 'qrcode') {
      const qr: string =
        payload?.qrcode ??
        payload?.data?.qrcode ??
        payload?.data?.qr ??
        '';
      if (qr) {
        await this.uazapi.saveQrCode(channelConfigId, qr);
        this.logger.log(`QR atualizado para canal ${channelConfigId}`);
      }
      return { ok: true };
    }

    if (eventType === 'connection') {
      const connected: boolean =
        payload?.instance?.status === 'connected' ||
        payload?.connected === true ||
        payload?.data?.connected === true;
      const status = connected ? 'connected' : 'disconnected';
      await this.channels.updateStatus(channelConfigId, status);
      if (connected) {
        const owner: string = payload?.instance?.owner ?? payload?.data?.instance?.owner ?? '';
        const phone: string = owner.replace('@s.whatsapp.net', '');
        const profileName: string = payload?.instance?.profileName ?? payload?.data?.instance?.profileName ?? '';
        if (phone) await this.channels.updateConfig(channelConfigId, { connectedPhone: phone, profileName });
      }
      this.events.emit('channel.status.changed', { channelConfigId, status, workspaceId: channel.workspaceId });
      this.logger.log(`Canal ${channelConfigId} → ${status}`);
      return { ok: true };
    }

    if (eventType === 'messages' || eventType === 'message') {
      // Log do payload bruto para diagnóstico (truncado para não poluir)
      this.logger.log(`[diag] payload keys=${Object.keys(payload ?? {}).join(',')} msgKeys=${Object.keys(payload?.message ?? payload?.data ?? {}).join(',') || 'n/a'}`);

      // uazapGO pode mandar os dados em payload.message, payload.data, ou direto na raiz
      const nested = payload?.message ?? payload?.data ?? null;
      // Se o objeto aninhado não tem campos de mensagem, usa a raiz do payload
      const msg: any = (nested?.type || nested?.messageType || nested?.chatid || nested?.key)
        ? nested
        : (payload ?? {});

      const fromMe: boolean =
        msg?.fromMe ?? msg?.key?.fromMe ??
        payload?.fromMe ?? false;

      // Tipo da mensagem — tenta todos os campos conhecidos
      const rawType: string =
        msg?.type ?? msg?.messageType ??
        payload?.type ?? payload?.messageType ??
        'conversation';
      // uazapGO envia type='media' com o subtipo real em msg.mediaType (audio, ptt, image, etc.)
      const rawMsgType: string = rawType === 'media'
        ? (msg?.mediaType ?? rawType)
        : rawType;

      this.logger.log(`[diag] rawType=${rawType} rawMsgType=${rawMsgType} fromMe=${msg?.fromMe ?? msg?.key?.fromMe ?? payload?.fromMe ?? false} msgid=${msg?.messageid ?? msg?.key?.id ?? payload?.messageid ?? payload?.id ?? 'none'}`);

      // Ignorar tipos sem conteúdo exibível (reações, protocolos, etc.)
      if (IGNORED_TYPES.has(rawMsgType)) {
        this.logger.log(`[diag] dropped IGNORED_TYPE=${rawMsgType}`);
        return { ok: true };
      }

      const mediaType: MessageType | undefined = MEDIA_TYPES[rawMsgType];

      // Extrair texto / legenda — cobre múltiplas estruturas do uazapGO
      const text: string =
        msg?.text ??
        msg?.body ??
        msg?.content ??
        msg?.caption ??
        msg?.message?.conversation ??
        msg?.message?.extendedTextMessage?.text ??
        msg?.message?.imageMessage?.caption ??
        msg?.message?.videoMessage?.caption ??
        msg?.message?.documentMessage?.caption ??
        msg?.message?.audioMessage?.caption ??
        '';

      // Body: texto real → placeholder de mídia → placeholder de tipo especial
      const normalizedType = rawMsgType.replace('Message', '').toLowerCase();
      const body =
        text ||
        (mediaType ? `[${normalizedType}]` : (BODY_PLACEHOLDER[rawMsgType] ?? ''));

      if (!body) {
        this.logger.warn(`[diag] dropped empty body type=${rawMsgType} mediaType=${mediaType ?? 'none'} text="${text}" msgKeys=${Object.keys(msg ?? {}).join(',')}`);
        return { ok: true };
      }

      // chatid / from — tenta msg e raiz do payload
      const chatid: string =
        msg?.chatid ?? msg?.key?.remoteJid ?? msg?.remoteJid ??
        payload?.chatid ?? payload?.remoteJid ?? '';
      const from = chatid
        .replace('@s.whatsapp.net', '')
        .replace(/@lid$/, '')
        .replace(/@c\.us$/, '');

      if (!from) {
        this.logger.warn(`Mensagem sem remetente (type=${rawMsgType}) — payload: ${JSON.stringify(payload).slice(0, 300)}`);
        return { ok: true };
      }

      const fromName: string =
        msg?.senderName ?? msg?.pushName ??
        payload?.senderName ?? payload?.pushName ??
        payload?.chat?.name ?? '';

      const externalMessageId: string =
        msg?.messageid ?? msg?.key?.id ??
        payload?.messageid ?? payload?.id ??
        `uza-${Date.now()}`;

      const rawTs: number =
        msg?.messageTimestamp ?? msg?.t ??
        payload?.messageTimestamp ?? payload?.t ??
        Date.now();
      const receivedAt = new Date(rawTs > 1e12 ? rawTs : rawTs * 1000);

      // URL de mídia — fileURL (campo oficial da API) ou campos aninhados por tipo
      let mediaUrl: string | undefined =
        msg?.url ?? msg?.mediaUrl ?? msg?.fileUrl ?? msg?.fileURL ??
        msg?.message?.imageMessage?.url ??
        msg?.message?.videoMessage?.url ??
        msg?.message?.audioMessage?.url ??
        msg?.message?.documentMessage?.url ??
        msg?.message?.stickerMessage?.url ??
        msg?.message?.pttMessage?.url ??
        undefined;

      let mediaMimeType: string | undefined =
        msg?.mimetype ?? msg?.mimeType ??
        msg?.message?.imageMessage?.mimetype ??
        msg?.message?.videoMessage?.mimetype ??
        msg?.message?.audioMessage?.mimetype ??
        msg?.message?.documentMessage?.mimetype ??
        msg?.message?.stickerMessage?.mimetype ??
        undefined;

      const mediaFileName: string | undefined =
        msg?.fileName ?? msg?.filename ??
        msg?.message?.documentMessage?.fileName ??
        undefined;

      // Para mensagens de mídia sem URL, acionar download no uazapGO para obter URL hospedada
      if (mediaType && !mediaUrl && !externalMessageId.startsWith('uza-')) {
        const downloaded = await this.uazapi.downloadMedia(channelConfigId, externalMessageId);
        if (downloaded.fileURL) {
          mediaUrl = downloaded.fileURL;
          mediaMimeType = mediaMimeType ?? downloaded.mimetype;
          this.logger.log(`Mídia baixada para ${externalMessageId}: ${mediaUrl}`);
        } else {
          this.logger.warn(`Sem URL de mídia para ${rawMsgType} id=${externalMessageId} from=${from}`);
        }
      }

      const eventPayload = {
        channelConfigId,
        channelType: 'uazapi',
        externalMessageId,
        from,
        fromName,
        body,
        receivedAt,
        messageType: mediaType ?? 'text',
        mediaUrl,
        mediaMimeType,
        mediaFileName,
      };

      if (fromMe) {
        this.logger.log(`outbound-from-phone ${rawMsgType} to ${from}: "${body.slice(0, 60)}"`);
        this.events.emit('message.outbound.fromphone', eventPayload);
      } else {
        this.logger.log(`inbound ${rawMsgType} from ${from} (${fromName}): "${body.slice(0, 60)}"`);
        this.events.emit('message.inbound.received', eventPayload);
      }
    }

    return { ok: true };
  }
}
