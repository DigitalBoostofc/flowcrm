import { IsOptional, IsString, IsISO8601 } from 'class-validator';

export class UpdateContactActivityDto {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string | null;
}
