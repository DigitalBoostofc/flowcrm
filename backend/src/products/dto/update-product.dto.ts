import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductAppliesTo, ProductClientType, ProductType } from '../entities/product.entity';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string | null;

  @IsOptional()
  @IsIn(['contact', 'company'])
  clientType?: ProductClientType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientName?: string | null;

  @IsOptional()
  @IsIn(['produto', 'servico'])
  type?: ProductType;

  @IsOptional()
  @IsIn(['pessoa', 'empresa', 'ambos'])
  appliesTo?: ProductAppliesTo;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
