import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { IntegrationsService } from './integrations.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, IntegrationsService],
  exports: [SettingsService, IntegrationsService],
})
export class SettingsModule {}



