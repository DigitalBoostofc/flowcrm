import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ActivationRulesDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() afterHours?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() weekends?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() unassigned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() always?: boolean;
}

class ConversationFlowStepDto {
  @ApiProperty() @IsString() id: string;
  @ApiProperty() @IsInt() @Min(0) order: number;
  @ApiProperty() @IsString() @Length(2, 80) name: string;
  @ApiProperty() @IsString() @Length(2, 500) goal: string;
  @ApiProperty() @IsString() @Length(2, 500) completionCriteria: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() pipelineStageId?: string | null;
}

export class CreateAgentDto {
  @ApiProperty({ minLength: 2, maxLength: 80, example: 'Júlia' })
  @IsString() @Length(2, 80)
  name: string;

  @ApiPropertyOptional({ enum: ['formal', 'proxima', 'divertida'], default: 'proxima' })
  @IsOptional() @IsEnum(['formal', 'proxima', 'divertida'])
  persona?: 'formal' | 'proxima' | 'divertida';

  @ApiPropertyOptional({ default: 'claude-haiku-4-5' })
  @IsOptional() @IsString() @Length(3, 60)
  model?: string;

  @ApiPropertyOptional({ description: 'System prompt customizado. Se vazio, será gerado a partir da persona.' })
  @IsOptional() @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ type: [String], description: 'IDs de canais (ChannelConfig) que o agente pode usar.' })
  @IsOptional() @IsArray() @IsUUID('4', { each: true })
  enabledChannels?: string[];

  @ApiPropertyOptional({ type: ActivationRulesDto })
  @IsOptional() @ValidateNested() @Type(() => ActivationRulesDto)
  activationRules?: ActivationRulesDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  allowedTools?: string[];

  @ApiPropertyOptional({ type: [String], example: ['cancelar', 'reclamar', 'falar com humano'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  escalationKeywords?: string[];

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 5 })
  @IsOptional() @IsInt() @Min(1) @Max(50)
  maxMessagesPerConv?: number;

  @ApiPropertyOptional({ minimum: 5, maximum: 600, default: 30 })
  @IsOptional() @IsInt() @Min(5) @Max(600)
  cooldownSeconds?: number;

  @ApiPropertyOptional() @IsOptional() @IsUUID() defaultPipelineB2C?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUUID() defaultPipelineB2B?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() initialDisclaimer?: string | null;

  @ApiPropertyOptional({ type: [ConversationFlowStepDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ConversationFlowStepDto)
  conversationFlow?: ConversationFlowStepDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  active?: boolean;
}
