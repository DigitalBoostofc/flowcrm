import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCustomerOriginDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;
}
