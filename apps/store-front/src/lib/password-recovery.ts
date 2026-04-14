/**
 * URLs y persistencia ligera para recuperación de contraseña con contexto de tienda.
 */

const LOGIN_HINT_KEY = 'sf_password_recovery_login_href';

export function buildStorefrontResetPath(origen: string, slug: string): string {
  return `/${encodeURIComponent(origen)}/${encodeURIComponent(slug)}/auth/reset-password`;
}

export function buildStorefrontForgotPath(origen: string, slug: string): string {
  return `/${encodeURIComponent(origen)}/${encodeURIComponent(slug)}/auth/forgot-password`;
}

export function getAbsoluteResetUrl(origen: string, slug: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${buildStorefrontResetPath(origen, slug)}`;
}

export function passwordResetViaApiOnly(): boolean {
  return process.env.NEXT_PUBLIC_PASSWORD_RESET_USE_API === 'true';
}

/** Guarda a dónde volver tras restablecer (login contextual). */
export function rememberRecoveryLoginHref(href: string): void {
  try {
    sessionStorage.setItem(LOGIN_HINT_KEY, href);
  } catch {
    /* ignore */
  }
}

export function clearRecoveryLoginHref(): void {
  try {
    sessionStorage.removeItem(LOGIN_HINT_KEY);
  } catch {
    /* ignore */
  }
}
