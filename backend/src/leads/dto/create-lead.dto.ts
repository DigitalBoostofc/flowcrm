import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLeadDto {
  @IsNotEmpty()
  @IsUUID()
  contactId: string;

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
}
