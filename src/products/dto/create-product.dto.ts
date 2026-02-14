import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Áo thun livestream' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 'Sản phẩm dành riêng cho live sale' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: 19.9 })
  @IsNumber()
  @IsPositive()
  price!: number;

  @ApiProperty({ example: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200' })
  @IsString()
  @IsUrl()
  imageUrl!: string;

  @ApiProperty({ required: false, enum: ['DRAFT', 'LIVE', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED'] })
  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'LIVE', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED'])
  status?: 'DRAFT' | 'LIVE' | 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED';
}
