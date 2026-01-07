import { Module } from '@nestjs/common';
import { LandingSlidersController } from './landing-sliders.controller';
import { LandingSlidersService } from './landing-sliders.service';
import { SliderImagesService } from './slider-images.service';

@Module({
  controllers: [LandingSlidersController],
  providers: [LandingSlidersService, SliderImagesService],
  exports: [LandingSlidersService, SliderImagesService],
})
export class LandingSlidersModule {}

