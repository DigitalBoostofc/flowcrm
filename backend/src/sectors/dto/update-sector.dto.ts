import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSectorDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
