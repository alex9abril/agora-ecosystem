import { Module } from '@nestjs/common';
import { LogisticsController } from './logistics.controller';
import { LogisticsService } from './logistics.service';
import { SkydropxService } from './skydropx/skydropx.service';
import { SkydropxRefreshScheduler } from './skydropx-refresh.scheduler';
import { SettingsModule } from '../settings/settings.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [SettingsModule, OrdersModule],
  controllers: [LogisticsController],
  providers: [LogisticsService, SkydropxService, SkydropxRefreshScheduler],
  exports: [LogisticsService, SkydropxService],
})
export class LogisticsModule {}

