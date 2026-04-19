import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ClassifyLeadDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;
}
