import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
export class PriceQuantityPair {
  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  ord_name: string;

  @IsString()
  ord_direction: string;

  @IsString()
  ord_product_type: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceQuantityPair)
  ord_price_quantity_pairs: PriceQuantityPair[];

  @IsNumber()
  ord_fk_mtu_id: number;

  @IsNumber()
  ord_fk_cmp_id: number;

  @IsNumber()
  @IsOptional()
  ord_fk_prtf_id: number;

  @IsNumber()
  @IsOptional() //! Make it here optional -  In case missing find the id inside service
  ord_fk_nd_id: number;
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {}
