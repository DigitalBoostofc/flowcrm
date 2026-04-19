import {
  IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AutomationStepDto {
  @IsInt()
  @Min(0)
  position: number;

  @IsString()
  @IsIn(['wait', 'filter', 'send_whatsapp'])
  type: 'wait' | 'filter' | 'send_whatsapp';

  @IsObject()
  config: Record<string, unknown>;
}

export class CreateAutomationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsIn(['pipeline', 'stage'])
  triggerType: 'pipeline' | 'stage';

  @IsOptional()
  @IsUUID()
  pipelineId?: string | null;

  @IsOptional()
  @IsUUID()
  stageId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationStepDto)
  steps: AutomationStepDto[];
}
