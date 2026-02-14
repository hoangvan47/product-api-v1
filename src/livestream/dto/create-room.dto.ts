import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'Flash Sale 20h' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;
}
