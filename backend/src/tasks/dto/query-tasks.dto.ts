import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { TaskStatus, TaskType } from '../entities/task.entity';

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
  @IsISO8601()
  dueFrom?: string;

  @IsOptional()
  @IsISO8601()
  dueTo?: string;

  @IsOptional()
  @IsString()
  range?: 'today' | 'week' | 'all';
}
