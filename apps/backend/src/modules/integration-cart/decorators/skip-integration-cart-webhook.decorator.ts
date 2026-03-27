import { SetMetadata } from '@nestjs/common';

export const SKIP_INTEGRATION_CART_WEBHOOK_KEY = 'skipIntegrationCartWebhook';

/** Omite IntegrationCartWebhookGuard (rutas públicas validadas por token `t`). */
export const SkipIntegrationCartWebhook = () => SetMetadata(SKIP_INTEGRATION_CART_WEBHOOK_KEY, true);
