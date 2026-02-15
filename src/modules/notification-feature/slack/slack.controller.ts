import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../@core/decorators/public.decorator';
import { RefreshSlackTokenDto } from './dto/refresh-slack-token.dto';
import { SendSlackMessageDto } from './dto/send-slack-message.dto';
import { SlackService } from './slack.service';

@ApiTags('slack')
@Controller('slack')
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Public()
  @Post('send')
  @ApiOperation({ summary: 'Gửi message/link APK lên Slack bằng access token hoặc webhook' })
  send(@Body() dto: SendSlackMessageDto) {
    return this.slackService.sendMessage(dto);
  }

  @Public()
  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh Slack access token từ refresh token' })
  refreshToken(@Body() dto: RefreshSlackTokenDto) {
    return this.slackService.refreshAccessToken(dto);
  }
}
