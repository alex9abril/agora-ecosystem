import { Module } from '@nestjs/common';
import { KarlopayController } from './karlopay.controller';
import { KarlopayService } from './karlopay.service';
import { SettingsModule } from '../../settings/settings.module';
import { EmailModule } from '../../email/email.module';
import { BusinessesModule } from '../../businesses/businesses.module';
import { KarlopayWebhookGuard } from '../../../common/guards/karlopay-webhook.guard';
import { KarlopayPaymentWebhookExecutionLogService } from './karlopay-payment-webhook-execution-log.service';
import { KarlopayPaymentWebhookBitacoraInterceptor } from './karlopay-payment-webhook-bitacora.interceptor';

@Module({
  imports: [SettingsModule, EmailModule, BusinessesModule],
  controllers: [KarlopayController],
  providers: [
    KarlopayService,
    KarlopayPaymentWebhookExecutionLogService,
    KarlopayPaymentWebhookBitacoraInterceptor,
    KarlopayWebhookGuard,
  ],
  exports: [KarlopayService],
})
export class KarlopayModule {}

