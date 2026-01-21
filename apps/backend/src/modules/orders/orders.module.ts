import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { TaxesModule } from '../catalog/taxes/taxes.module';
import { WalletModule } from '../wallet/wallet.module';
import { KarlopayModule } from '../payments/karlopay/karlopay.module';
import { SettingsModule } from '../settings/settings.module';
import { EmailModule } from '../email/email.module';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [TaxesModule, WalletModule, KarlopayModule, SettingsModule, EmailModule, BusinessesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

