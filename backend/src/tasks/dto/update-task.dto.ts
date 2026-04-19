import { IsArray, IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { TaskTargetType, TaskType } from '../entities/task.entity';

export class UpdateTaskDto {
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string | null;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  responsibleIds?: string[];

  @IsOptional()
  @IsEnum(TaskTargetType)
  targetType?: TaskTargetType;

  @IsOptional()
  @IsUUID()
  targetId?: string;

  @IsOptional()
  @IsString()
  targetLabel?: string;

  @IsOptional()
  @IsArray()
  attachments?: { name: string; url: string }[];
}
