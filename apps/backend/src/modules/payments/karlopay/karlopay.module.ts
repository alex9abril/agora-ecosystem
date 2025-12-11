import { Module } from '@nestjs/common';
import { KarlopayController } from './karlopay.controller';
import { KarlopayService } from './karlopay.service';
import { SettingsModule } from '../../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [KarlopayController],
  providers: [KarlopayService],
  exports: [KarlopayService],
})
export class KarlopayModule {}

