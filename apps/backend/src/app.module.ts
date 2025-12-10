import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { RequestBodyLoggerMiddleware } from './common/middleware/request-body-logger.middleware';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ApiLoggingInterceptor } from './common/interceptors/api-logging.interceptor';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { ApiKeysService } from './modules/api-keys/api-keys.service';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { RepartidoresModule } from './modules/repartidores/repartidores.module';
import { ClientsModule } from './modules/clients/clients.module';
import { CategoriesModule } from './modules/catalog/categories/categories.module';
import { ProductsModule } from './modules/catalog/products/products.module';
import { ProductTypeFieldConfigModule } from './modules/catalog/product-type-field-config/product-type-field-config.module';
import { TaxesModule } from './modules/catalog/taxes/taxes.module';
import { ServiceRegionsModule } from './modules/service-regions/service-regions.module';
import { BusinessUsersModule } from './modules/business-users/business-users.module';
import { CartModule } from './modules/cart/cart.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { OrdersModule } from './modules/orders/orders.module';
import { VehiclesModule } from './modules/catalog/vehicles/vehicles.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    AuthModule,
    HealthModule,
    ApiKeysModule,
    BusinessesModule,
    RepartidoresModule,
    ClientsModule,
    CategoriesModule,
    ProductsModule,
    ProductTypeFieldConfigModule,
    TaxesModule,
    ServiceRegionsModule,
    BusinessUsersModule,
    CartModule,
    AddressesModule,
    OrdersModule,
    VehiclesModule,
    SettingsModule,
    // Otros módulos se agregarán aquí
    // UsersModule,
    // etc.
  ],
  controllers: [],
  providers: [
    // Guard global: Todos los endpoints requieren autenticación por defecto
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    // Interceptor global: Transforma todas las respuestas
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Interceptor global: Registra todas las peticiones a la API
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiLoggingInterceptor,
    },
    // Interceptor global: Loguea el body de los requests antes de la validación (para debugging)
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    // Filtro global: Maneja todas las excepciones
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplicar el middleware a todas las rutas de cart
    consumer
      .apply(RequestBodyLoggerMiddleware)
      .forRoutes('cart');
  }
}
