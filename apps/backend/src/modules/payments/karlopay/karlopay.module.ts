import { Module } from '@nestjs/common';
import { KarlopayController } from './karlopay.controller';
import { KarlopayService } from './karlopay.service';
import { SettingsModule } from '../../settings/settings.module';
import { EmailModule } from '../../email/email.module';
import { BusinessesModule } from '../../businesses/businesses.module';

@Module({
  imports: [SettingsModule, EmailModule, BusinessesModule],
  controllers: [KarlopayController],
  providers: [KarlopayService],
  exports: [KarlopayService],
})
export class KarlopayModule {}

