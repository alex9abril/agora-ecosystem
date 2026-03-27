import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { IntegrationCartModule } from '../integration-cart/integration-cart.module';

@Module({
  imports: [IntegrationCartModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}

