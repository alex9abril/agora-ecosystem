import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { TaxesModule } from '../catalog/taxes/taxes.module';
import { WalletModule } from '../wallet/wallet.module';
import { KarlopayModule } from '../payments/karlopay/karlopay.module';

@Module({
  imports: [TaxesModule, WalletModule, KarlopayModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

