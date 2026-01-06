import { Module } from '@nestjs/common';
import { LogisticsController } from './logistics.controller';
import { LogisticsService } from './logistics.service';
import { SkydropxService } from './skydropx/skydropx.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [LogisticsController],
  providers: [LogisticsService, SkydropxService],
  exports: [LogisticsService, SkydropxService],
})
export class LogisticsModule {}

