import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLossReasonDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  label: string;
}
