import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class UpdateAiSettingsDto {
  @ApiPropertyOptional({ enum: ['platform', 'byo'], description: 'platform = usa key do FlowCRM (cobrado no plano). byo = cliente plugou própria key.' })
  @IsOptional() @IsEnum(['platform', 'byo'])
  keySource?: 'platform' | 'byo';

  @ApiPropertyOptional({ description: 'API key do cliente (apenas quando keySource=byo). Começa com "sk-ant-".', example: 'sk-ant-api03-...' })
  @IsOptional()
  @IsString()
  @Matches(/^sk-ant-[A-Za-z0-9_-]{20,}$/, { message: 'API key inválida — formato esperado sk-ant-...' })
  apiKey?: string;

  @ApiPropertyOptional({ default: 'claude-haiku-4-5' })
  @IsOptional() @IsString()
  defaultModel?: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Soft cap mensal. Null = sem limite.' })
  @IsOptional() @IsInt() @Min(0)
  monthlyTokenBudget?: number | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  enabled?: boolean;
}
