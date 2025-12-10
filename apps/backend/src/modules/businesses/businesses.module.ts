import { Module } from '@nestjs/common';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { BrandingImagesService } from './branding-images.service';

@Module({
  controllers: [BusinessesController],
  providers: [BusinessesService, BrandingImagesService],
  exports: [BusinessesService, BrandingImagesService],
})
export class BusinessesModule {}

