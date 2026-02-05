import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { IntegrationsService } from './integrations.service';
import { IntegrationLogsService } from './integration-logs.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, IntegrationsService, IntegrationLogsService],
  exports: [SettingsService, IntegrationsService, IntegrationLogsService],
})
export class SettingsModule {}



