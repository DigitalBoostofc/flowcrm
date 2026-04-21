import { IsString, IsOptional, IsISO8601 } from 'class-validator';

export class UpdateLeadActivityDto {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string | null;
}
