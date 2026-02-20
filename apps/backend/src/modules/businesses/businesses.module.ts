import { Module, forwardRef } from '@nestjs/common';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { BrandingImagesService } from './branding-images.service';
import { KarbotService } from './karbot.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [forwardRef(() => SettingsModule)],
  controllers: [BusinessesController],
  providers: [BusinessesService, BrandingImagesService, KarbotService],
  exports: [BusinessesService, BrandingImagesService, KarbotService],
})
export class BusinessesModule {}

