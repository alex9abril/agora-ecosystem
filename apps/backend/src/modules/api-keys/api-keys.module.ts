import { Global, Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysGuard } from '../../common/guards/api-keys.guard';

@Global() // Hacer el módulo global para que ApiKeysService esté disponible en otros módulos
@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeysGuard],
  exports: [ApiKeysService, ApiKeysGuard],
})
export class ApiKeysModule {}

