export interface SendMessageOptions {
  channelConfigId: string;
  to: string;
  body: string;
}

export interface SendMessageResult {
  externalMessageId: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface NormalizedInbound {
  externalMessageId: string;
  from: string;
  fromName?: string;
  body: string;
  receivedAt: Date;
  rawPayload: unknown;
}

export interface ChannelAdapter {
  readonly type: 'evolution' | 'uazapi' | 'meta' | 'telegram';
  sendMessage(opts: SendMessageOptions): Promise<SendMessageResult>;
}
