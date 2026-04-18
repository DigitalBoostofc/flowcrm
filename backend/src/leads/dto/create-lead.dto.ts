import { IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreateLeadDto {
  @IsUUID()
  contactId: string;

  @IsUUID()
  pipelineId: string;

  @IsUUID()
  stageId: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsNumber()
  value?: number;
}
