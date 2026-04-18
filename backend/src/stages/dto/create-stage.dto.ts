import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateStageDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  position?: number;

  @IsOptional()
  @IsString()
  color?: string;
}
