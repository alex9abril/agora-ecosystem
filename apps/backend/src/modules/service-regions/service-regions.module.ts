import { Module } from '@nestjs/common';
import { ServiceRegionsService } from './service-regions.service';
import { ServiceRegionsController } from './service-regions.controller';

@Module({
  providers: [ServiceRegionsService],
  controllers: [ServiceRegionsController],
  exports: [ServiceRegionsService],
})
export class ServiceRegionsModule {}







