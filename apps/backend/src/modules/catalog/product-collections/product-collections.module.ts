import { Module } from '@nestjs/common';
import { ProductCollectionsController } from './product-collections.controller';
import { ProductCollectionsService } from './product-collections.service';

@Module({
  controllers: [ProductCollectionsController],
  providers: [ProductCollectionsService],
  exports: [ProductCollectionsService],
})
export class ProductCollectionsModule {}
