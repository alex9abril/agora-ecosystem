import { Module } from '@nestjs/common';
import { ProductsModule } from '../catalog/products/products.module';
import { StorefrontChatController } from './storefront-chat.controller';
import { StorefrontChatService } from './storefront-chat.service';

@Module({
  imports: [ProductsModule],
  controllers: [StorefrontChatController],
  providers: [StorefrontChatService],
  exports: [StorefrontChatService],
})
export class StorefrontChatModule {}
