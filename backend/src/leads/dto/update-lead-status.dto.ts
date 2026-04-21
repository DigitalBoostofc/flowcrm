import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { LeadStatus } from '../entities/lead.entity';

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  status: LeadStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  lossReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  freezeReason?: string;

  @IsOptional()
  @IsDateString()
  frozenReturnDate?: string;
}
