import { Module, forwardRef } from '@nestjs/common';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { BrandingImagesService } from './branding-images.service';
import { KarbotService } from './karbot.service';
import { SettingsModule } from '../settings/settings.module';
import { StoresModule } from '../stores/stores.module';

@Module({
  imports: [forwardRef(() => SettingsModule), StoresModule],
  controllers: [BusinessesController],
  providers: [BusinessesService, BrandingImagesService, KarbotService],
  exports: [BusinessesService, BrandingImagesService, KarbotService],
})
export class BusinessesModule {}

