import {
  IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AutomationStepDto } from './create-automation.dto';

export class UpdateAutomationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pipeline', 'stage'])
  triggerType?: 'pipeline' | 'stage';

  @IsOptional()
  @IsUUID()
  pipelineId?: string | null;

  @IsOptional()
  @IsUUID()
  stageId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationStepDto)
  steps?: AutomationStepDto[];
}
