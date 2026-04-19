import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLossReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}
