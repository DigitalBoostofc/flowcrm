import { IsArray, IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { LeadItem, LeadPrivacy } from '../entities/lead.entity';

export class CreateLeadDto {
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsNotEmpty()
  @IsUUID()
  stageId: string;

  @IsNotEmpty()
  @IsUUID()
  pipelineId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value?: number;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  conclusionDate?: string;

  @IsOptional()
  @IsEnum(LeadPrivacy)
  privacy?: LeadPrivacy;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  additionalAccessUserIds?: string[];

  @IsOptional()
  @IsArray()
  items?: LeadItem[];
}
