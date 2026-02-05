import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailModule } from '../email/email.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [EmailModule, BusinessesModule, SettingsModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

