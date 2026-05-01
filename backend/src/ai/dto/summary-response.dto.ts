import { ApiProperty } from '@nestjs/swagger';

export class SummaryResponseDto {
  @ApiProperty({ description: 'Resumo gerado em PT-BR (até ~5 linhas).' })
  summary: string;

  @ApiProperty({ description: 'Se o resultado veio do cache (sem nova chamada ao provider).' })
  cached: boolean;

  @ApiProperty({ description: 'Modelo usado pelo provider (ex.: google/gemini-2.5-flash-lite).' })
  model: string;

  @ApiProperty({ description: 'Total de tokens consumidos nesta chamada (0 se cache hit).' })
  tokensUsed: number;
}
