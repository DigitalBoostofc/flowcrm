import { IsOptional, IsString, IsNumber, IsDateString, IsUUID, Min, Max, MaxLength, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLeadDto {
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
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  conclusionDate?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  ranking?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
