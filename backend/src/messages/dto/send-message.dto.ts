import { IsString, IsUUID, IsOptional, IsIn } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  conversationId: string;

  @IsUUID()
  channelConfigId: string;

  @IsString()
  body: string;
}

export class SendMediaDto {
  @IsUUID()
  conversationId: string;

  @IsUUID()
  channelConfigId: string;

  @IsIn(['image', 'video', 'audio', 'document', 'sticker'])
  mediaType: 'image' | 'video' | 'audio' | 'document' | 'sticker';

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  base64?: string;

  @IsOptional()
  @IsString()
  mediaMimeType?: string;

  @IsOptional()
  @IsString()
  mediaCaption?: string;

  @IsOptional()
  @IsString()
  mediaFileName?: string;

  @IsOptional()
  @IsString()
  body?: string;
}

export class ReactMessageDto {
  @IsString()
  messageId: string;

  @IsString()
  emoji: string;

  @IsUUID()
  channelConfigId: string;
}

export class DeleteMessageDto {
  @IsString()
  messageId: string;

  @IsUUID()
  channelConfigId: string;
}
