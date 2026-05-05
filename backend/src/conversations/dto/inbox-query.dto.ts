import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class InboxQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;

  @ApiPropertyOptional({ enum: ['all', 'archived'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'archived'])
  filter?: 'all' | 'archived' = 'all';

  @ApiPropertyOptional({ description: 'Filtrar por inbox tag' })
  @IsOptional()
  @IsUUID()
  tagId?: string;
}
