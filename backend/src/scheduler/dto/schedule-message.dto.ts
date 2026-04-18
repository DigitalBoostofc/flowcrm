import { IsDateString, IsString, IsUUID } from 'class-validator';

export class ScheduleMessageDto {
  @IsUUID()
  conversationId: string;

  @IsString()
  body: string;

  @IsDateString()
  scheduledAt: string;

  @IsUUID()
  channelConfigId: string;
}
