import { Module } from '@nestjs/common';
import { KarlopayController } from './karlopay.controller';
import { KarlopayService } from './karlopay.service';
import { SettingsModule } from '../../settings/settings.module';
import { EmailModule } from '../../email/email.module';
import { BusinessesModule } from '../../businesses/businesses.module';
import { KarlopayWebhookGuard } from '../../common/guards/karlopay-webhook.guard';

@Module({
  imports: [SettingsModule, EmailModule, BusinessesModule],
  controllers: [KarlopayController],
  providers: [KarlopayService, KarlopayWebhookGuard],
  exports: [KarlopayService],
})
export class KarlopayModule {}

