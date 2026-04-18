import { IsEnum, IsString, IsOptional, IsUUID } from 'class-validator';
import { ActivityType } from '../entities/lead-activity.entity';

export class CreateLeadActivityDto {
  @IsEnum(ActivityType)
  type: ActivityType;

  @IsString()
  body: string;

  @IsOptional()
  @IsUUID()
  createdById?: string;
}
