import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateStageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeLimitDays?: number | null;
}
