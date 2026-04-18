import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreatePipelineDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
