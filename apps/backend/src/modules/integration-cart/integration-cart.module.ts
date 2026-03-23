import { Module } from '@nestjs/common';
import { IntegrationCartController } from './integration-cart.controller';
import { IntegrationCartService } from './integration-cart.service';
import { StoreProductEligibilityService } from './store-product-eligibility.service';
import { IntegrationCartWebhookGuard } from './guards/integration-cart-webhook.guard';
import { StoresModule } from '../stores/stores.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [StoresModule, SettingsModule],
  controllers: [IntegrationCartController],
  providers: [IntegrationCartService, StoreProductEligibilityService, IntegrationCartWebhookGuard],
  exports: [IntegrationCartService],
})
export class IntegrationCartModule {}
