import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { TaskStatus, TaskType, TaskTargetType } from '../entities/task.entity';

export class QueryTasksDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(TaskTargetType)
  targetType?: TaskTargetType;

  @IsOptional()
  @IsUUID()
  targetId?: string;

  @IsOptional()
  @IsISO8601()
  dueFrom?: string;

  @IsOptional()
  @IsISO8601()
  dueTo?: string;

  @IsOptional()
  @IsString()
  range?: 'today' | 'week' | 'all';
}
