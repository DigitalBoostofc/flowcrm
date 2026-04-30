import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class SetLeadScoreDto {
  @ApiProperty({
    description: 'Score do lead (0-100). Valores acima de 80 indicam lead "quente".',
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  score: number;
}
