/**
 * AGORA Parent Listener - Script para el sitio padre que embebe la tienda en iframe
 * Escucha postMessage del iframe y redirige la ventana principal al checkout standalone
 * [AGORA EMBED]
 *
 * Uso: <script src="https://tu-store.agoramp.mx/agora-parent-listener.js"></script>
 *
 * Configuración opcional (antes de cargar el script):
 *   window.AGORA_EMBED_CONFIG = {
 *     allowedIframeOrigins: ['https://store.agoramp.mx', 'https://staging-store.agoramp.mx'],
 *     allowedRedirectHosts: ['agoramp.mx', 'store.agoramp.mx', 'staging-store.agoramp.mx'],
 *     debug: true
 *   };
 */

(function () {
  'use strict';

  const LOG_PREFIX = '[AGORA EMBED]';

  const DEFAULT_ALLOWED_IFRAME_ORIGINS = [
    'http://localhost:3008',
    'http://127.0.0.1:3008',
    'https://agoramp.mx',
    'https://www.agoramp.mx',
    'https://staging.agoramp.mx',
    'https://store.agoramp.mx',
    'https://staging-store.agoramp.mx',
  ];

  const DEFAULT_ALLOWED_REDIRECT_HOSTS = [
    'localhost',
    '127.0.0.1',
    'agoramp.mx',
    'www.agoramp.mx',
    'staging.agoramp.mx',
    'store.agoramp.mx',
    'staging-store.agoramp.mx',
  ];

  const AGORA_MESSAGE_TYPES = {
    OPEN_TOP_CHECKOUT: 'AGORA_OPEN_TOP_CHECKOUT',
    RESIZE_IFRAME: 'AGORA_RESIZE_IFRAME',
    PING: 'AGORA_PING',
    PONG: 'AGORA_PONG',
  };

  const config = window.AGORA_EMBED_CONFIG || {};
  const allowedOrigins = config.allowedIframeOrigins || DEFAULT_ALLOWED_IFRAME_ORIGINS;
  const allowedRedirectHosts = config.allowedRedirectHosts || DEFAULT_ALLOWED_REDIRECT_HOSTS;
  const debug = config.debug === true;

  function log() {
    if (debug && console && console.log) {
      console.log.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
    }
  }

  function isValidOrigin(origin) {
    return allowedOrigins.indexOf(origin) !== -1;
  }

  function isUrlAllowed(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return allowedRedirectHosts.some(function (h) {
        return host === h || host.endsWith('.' + h);
      });
    } catch (e) {
      return false;
    }
  }

  function handleMessage(event) {
    if (!event || !event.data || typeof event.data !== 'object') return;

    const data = event.data;
    const origin = event.origin;

    if (!isValidOrigin(origin)) {
      log('Origen no permitido:', origin);
      return;
    }

    if (data.type === AGORA_MESSAGE_TYPES.OPEN_TOP_CHECKOUT) {
      const payload = data.payload;
      if (!payload || !payload.url) {
        log('Mensaje AGORA_OPEN_TOP_CHECKOUT sin payload.url');
        return;
      }

      if (!isUrlAllowed(payload.url)) {
        log('URL de checkout no permitida:', payload.url);
        return;
      }

      log('Redirigiendo a checkout standalone (top window):', payload.url);
      // CRÍTICO: Usar window.top para romper cualquier anidamiento de iframes.
      // Si el parent está en un iframe, window.location solo cambiaría ese iframe
      // y KarloPay cargaría dentro del iframe → error cross-origin con onbeforeunload.
      try {
        window.top.location.assign(payload.url);
      } catch (e) {
        log('window.top falló, intentando window.location:', e);
        window.location.assign(payload.url);
      }
    } else if (data.type === AGORA_MESSAGE_TYPES.PING) {
      log('Ping recibido, enviando PONG');
      try {
        event.source.postMessage(
          { type: AGORA_MESSAGE_TYPES.PONG, payload: { timestamp: Date.now() } },
          origin
        );
      } catch (e) {
        log('Error enviando PONG:', e);
      }
    } else if (data.type === AGORA_MESSAGE_TYPES.RESIZE_IFRAME) {
      // Futuro: ajustar altura del iframe
      log('RESIZE_IFRAME recibido (no implementado aún):', data.payload);
    }
  }

  if (window.addEventListener) {
    window.addEventListener('message', handleMessage, false);
    log('Listener AGORA registrado');
  }
})();
