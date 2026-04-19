import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStageRequiredFieldDto {
  @IsIn(['lead', 'company', 'contact'])
  targetType: 'lead' | 'company' | 'contact';

  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  fieldKey: string;

  @IsOptional()
  @IsString()
  question?: string | null;
}
