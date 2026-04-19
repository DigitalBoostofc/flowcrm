import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCustomerCategoryDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;
}
