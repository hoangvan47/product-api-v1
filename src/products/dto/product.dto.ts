import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  imageUrl!: string;

  @ApiProperty({ enum: ['DRAFT', 'LIVE', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED'] })
  status!: string;

  @ApiProperty()
  sellerId!: number;
}
