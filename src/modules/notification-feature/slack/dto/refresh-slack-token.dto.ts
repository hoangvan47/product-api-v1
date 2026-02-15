import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshSlackTokenDto {
  @ApiPropertyOptional({
    example: 'xoxe-1-...',
    description: 'Override refresh token; nếu bỏ trống sẽ dùng SLACK_REFRESH_TOKEN trong env',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
