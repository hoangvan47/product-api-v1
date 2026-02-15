import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class SendSlackMessageDto {
  @ApiProperty({
    example: 'Build APK mới đã sẵn sàng',
    description: 'Nội dung text gửi lên Slack',
  })
  @IsString()
  @MaxLength(3000)
  text!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/app-release.apk',
    description: 'Link APK/public artifact để đính kèm trong message',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  apkUrl?: string;

  @ApiPropertyOptional({
    example: 'C08ABCDEF12',
    description: 'Override channel id thay vì dùng SLACK_CHANNEL_ID',
  })
  @IsOptional()
  @IsString()
  channelId?: string;
}
