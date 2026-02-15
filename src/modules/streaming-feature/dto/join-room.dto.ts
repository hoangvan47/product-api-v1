import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class JoinRoomDto {
  @ApiProperty({ example: 42, required: false, description: 'User id cho viewer chưa đăng nhập token' })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiProperty({ example: 'viewer', enum: ['viewer', 'seller'] })
  @IsString()
  @IsIn(['viewer', 'seller'])
  role!: 'viewer' | 'seller';
}
