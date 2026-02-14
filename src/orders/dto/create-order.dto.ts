import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class CreateOrderItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productId!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ enum: ['LIVE', 'STORE'], example: 'STORE' })
  @IsString()
  @IsIn(['LIVE', 'STORE'])
  source!: 'LIVE' | 'STORE';

  @ApiProperty({ required: false, example: 'ls-abc123-xyz' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
