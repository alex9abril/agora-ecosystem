import { Module } from '@nestjs/common';
import { ProductClassificationsController } from './product-classifications.controller';
import { ProductClassificationsService } from './product-classifications.service';

@Module({
  controllers: [ProductClassificationsController],
  providers: [ProductClassificationsService],
  exports: [ProductClassificationsService],
})
export class ProductClassificationsModule {}
