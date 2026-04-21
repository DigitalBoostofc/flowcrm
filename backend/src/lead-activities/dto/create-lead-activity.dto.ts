import { IsEnum, IsString, IsOptional, IsUUID, IsISO8601 } from 'class-validator';
import { ActivityType } from '../entities/lead-activity.entity';

export class CreateLeadActivityDto {
  @IsEnum(ActivityType)
  type: ActivityType;

  @IsString()
  body: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsUUID()
  createdById?: string;
}
