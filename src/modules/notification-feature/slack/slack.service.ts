import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RefreshSlackTokenDto } from './dto/refresh-slack-token.dto';
import { SendSlackMessageDto } from './dto/send-slack-message.dto';

type SlackApiResponse = {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
};

@Injectable()
export class SlackService {
  constructor(private readonly configService: ConfigService) {}

  async sendMessage(dto: SendSlackMessageDto) {
    const apkText = dto.apkUrl ? `\nAPK: ${dto.apkUrl}` : '';
    const text = `${dto.text}${apkText}`;
    const accessToken = this.configService.get<string>('SLACK_ACCESS_TOKEN');
    const channelId = dto.channelId ?? this.configService.get<string>('SLACK_CHANNEL_ID');
    const webhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');

    if (accessToken && channelId) {
      const result = await this.postMessageByToken(accessToken, channelId, text);
      if (!result.ok) {
        throw new BadRequestException(`Slack API lỗi: ${result.error ?? 'unknown_error'}`);
      }
      return {
        mode: 'token',
        ok: true,
        channelId,
        response: result,
      };
    }

    if (webhookUrl) {
      await this.postMessageByWebhook(webhookUrl, text);
      return {
        mode: 'webhook',
        ok: true,
      };
    }

    throw new BadRequestException('Thiếu cấu hình Slack. Cần (SLACK_ACCESS_TOKEN + SLACK_CHANNEL_ID) hoặc SLACK_WEBHOOK_URL.');
  }

  async refreshAccessToken(dto: RefreshSlackTokenDto) {
    const refreshToken = dto.refreshToken ?? this.configService.get<string>('SLACK_REFRESH_TOKEN');
    const clientId = this.configService.get<string>('SLACK_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SLACK_CLIENT_SECRET');

    if (!refreshToken) {
      throw new BadRequestException('Thiếu refresh token. Hãy truyền body.refreshToken hoặc set SLACK_REFRESH_TOKEN.');
    }
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Thiếu SLACK_CLIENT_ID hoặc SLACK_CLIENT_SECRET để refresh token.');
    }

    const payload = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(`Không gọi được Slack OAuth API. HTTP ${response.status}`);
    }

    const json = (await response.json()) as SlackApiResponse;
    if (!json.ok) {
      throw new BadRequestException(`Refresh token thất bại: ${json.error ?? 'unknown_error'}`);
    }

    return {
      ok: true,
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in,
      scope: json.scope,
      tokenType: json.token_type,
    };
  }

  private async postMessageByToken(accessToken: string, channelId: string, text: string) {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel: channelId,
        text,
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(`Không gọi được Slack chat.postMessage. HTTP ${response.status}`);
    }

    return (await response.json()) as SlackApiResponse;
  }

  private async postMessageByWebhook(webhookUrl: string, text: string) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(`Không gọi được Slack webhook. HTTP ${response.status}`);
    }
  }
}
