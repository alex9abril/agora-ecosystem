import { Module, forwardRef } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { IntegrationsService } from './integrations.service';
import { IntegrationLogsService } from './integration-logs.service';
import { WebhookSecretsService } from './webhook-secrets.service';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [forwardRef(() => BusinessesModule)],
  controllers: [SettingsController],
  providers: [SettingsService, IntegrationsService, IntegrationLogsService, WebhookSecretsService],
  exports: [SettingsService, IntegrationsService, IntegrationLogsService, WebhookSecretsService],
})
export class SettingsModule {}



