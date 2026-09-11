import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductImagesService } from './product-images.service';
import { ProductEnrichmentService } from './product-enrichment.service';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [VehiclesModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductImagesService, ProductEnrichmentService],
  exports: [ProductsService, ProductImagesService, ProductEnrichmentService],
})
export class ProductsModule {}

