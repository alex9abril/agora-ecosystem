import { Module } from '@nestjs/common';
import { UserVehiclesController } from './user-vehicles.controller';
import { UserVehiclesService } from './user-vehicles.service';

@Module({
  controllers: [UserVehiclesController],
  providers: [UserVehiclesService],
  exports: [UserVehiclesService],
})
export class UserVehiclesModule {}

