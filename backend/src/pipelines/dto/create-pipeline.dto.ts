import { IsBoolean, IsOptional, IsString, IsIn, MaxLength } from 'class-validator';

export class CreatePipelineDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  sigla?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsIn(['sale', 'management'])
  kind?: 'sale' | 'management';
}
