import { IsOptional, IsString } from 'class-validator';

export class UpdateStageRequiredFieldDto {
  @IsOptional()
  @IsString()
  question?: string | null;
}
