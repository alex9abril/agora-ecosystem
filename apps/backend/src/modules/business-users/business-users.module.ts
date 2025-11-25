import { Module } from '@nestjs/common';
import { BusinessUsersController } from './business-users.controller';
import { BusinessUsersService } from './business-users.service';

@Module({
  controllers: [BusinessUsersController],
  providers: [BusinessUsersService],
  exports: [BusinessUsersService],
})
export class BusinessUsersModule {}

