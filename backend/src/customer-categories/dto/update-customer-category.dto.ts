import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCustomerCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
