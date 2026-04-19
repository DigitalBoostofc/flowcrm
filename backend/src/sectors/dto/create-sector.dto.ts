import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSectorDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;
}
