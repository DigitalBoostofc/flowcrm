import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  leadId: string;

  @IsString()
  channelType: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}
