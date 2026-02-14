import { Module } from '@nestjs/common';
import { LivestreamController } from './livestream.controller';
import { LivestreamGateway } from './livestream.gateway';
import { LivestreamService } from './livestream.service';

@Module({
  controllers: [LivestreamController],
  providers: [LivestreamService, LivestreamGateway],
})
export class LivestreamModule {}
