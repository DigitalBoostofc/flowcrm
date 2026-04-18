import { IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  conversationId: string;

  @IsUUID()
  channelConfigId: string;

  @IsString()
  body: string;
}
