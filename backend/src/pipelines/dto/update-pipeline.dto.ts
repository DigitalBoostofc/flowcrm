import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePipelineDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  sigla?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
