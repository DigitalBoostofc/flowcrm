import { IsNumber, IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
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
}
