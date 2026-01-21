import { Module } from '@nestjs/common';
import { ProductCollectionsController } from './product-collections.controller';
import { ProductCollectionsService } from './product-collections.service';
import { ProductCollectionImagesService } from './product-collection-images.service';

@Module({
  controllers: [ProductCollectionsController],
  providers: [ProductCollectionsService, ProductCollectionImagesService],
  exports: [ProductCollectionsService],
})
export class ProductCollectionsModule {}
