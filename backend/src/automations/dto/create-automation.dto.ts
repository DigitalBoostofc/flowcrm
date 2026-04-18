import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAutomationDto {
  @IsUUID()
  stageId: string;

  @IsInt()
  @Min(0)
  delayMinutes: number;

  @IsString()
  channelType: string;

  @IsUUID()
  channelConfigId: string;

  @IsUUID()
  templateId: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
