import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { LeadStatus } from '../entities/lead.entity';

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  status: LeadStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  lossReason?: string;
}
