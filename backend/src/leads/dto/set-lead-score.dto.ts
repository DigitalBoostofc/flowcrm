import { IsInt, Max, Min } from 'class-validator';

export class SetLeadScoreDto {
  @IsInt()
  @Min(0)
  @Max(100)
  score: number;
}
