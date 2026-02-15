import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtAuthGuard } from './@core/guards/jwt-auth.guard';
import { AuthModule } from './modules/authentication-feature/auth.module';
import { LivestreamModule } from './modules/streaming-feature/livestream.module';
import { OrdersModule } from './modules/order-feature/orders.module';
import { PrismaModule } from './modules/@shared/prisma/prisma.module';
import { ProductsModule } from './modules/product-feature/products.module';
import { RedisModule } from './modules/@shared/redis/redis.module';
import { SlackModule } from './modules/notification-feature/slack/slack.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    RedisModule,
    PrismaModule,
    AuthModule,
    ProductsModule,
    LivestreamModule,
    OrdersModule,
    SlackModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
