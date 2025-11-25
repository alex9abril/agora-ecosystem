import { Module } from '@nestjs/common';
import { ProductTypeFieldConfigController } from './product-type-field-config.controller';
import { ProductTypeFieldConfigService } from './product-type-field-config.service';

@Module({
  controllers: [ProductTypeFieldConfigController],
  providers: [ProductTypeFieldConfigService],
  exports: [ProductTypeFieldConfigService],
})
export class ProductTypeFieldConfigModule {}


