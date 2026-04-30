import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MoveLeadDto {
  @ApiProperty({
    description: 'UUID da etapa destino. Pode ser de outro pipeline (lead será re-vinculado).',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  stageId: string;
}
