import { IsOptional, IsString, IsNumber, IsDateString, IsUUID, Min, Max, MaxLength, IsInt, IsIn, IsArray } from 'class-validator';
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

  @IsOptional()
  @IsUUID()
  customerOriginId?: string | null;

  @IsOptional()
  @IsIn(['all', 'restricted'])
  privacy?: 'all' | 'restricted';

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  additionalAccessUserIds?: string[];
}
