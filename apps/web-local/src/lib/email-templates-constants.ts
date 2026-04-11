/**
 * Constantes y helpers compartidos para templates de correo
 */

import type { EmailTriggerType } from './email-templates';

export const triggerInfo: Record<EmailTriggerType, { name: string; description: string; variables: string[] }> = {
  user_registration: {
    name: 'Correo de Bienvenida',
    description: 'Se envía cuando un usuario se registra en la plataforma',
    variables: ['user_name', 'dashboard_url'],
  },
  order_confirmation: {
    name: 'Confirmación de Pedido',
    description: 'Se envía cuando se confirma un pedido',
    variables: ['user_name', 'order_number', 'order_date', 'order_total', 'payment_method', 'order_url'],
  },
  order_status_change: {
    name: 'Cambio de Estado de Pedido',
    description: 'Se envía cuando cambia el estado de un pedido',
    variables: ['user_name', 'order_number', 'previous_status', 'current_status', 'status_message', 'order_url'],
  },
  supervisor_notification: {
    name: 'Notificación para Supervisores',
    description: 'Se envía a los supervisores configurados cuando ocurre un evento (nueva venta, registro de cliente, cambio de estado)',
    variables: ['business_name', 'event_title', 'event_description', 'detail_section', 'action_url', 'action_label'],
  },
};

export const buildLogoHtml = (logoUrl: string) =>
  `<div style="margin-bottom: 20px; text-align: center;"><img src="${logoUrl}" alt="AGORA" data-email-logo="true" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" /></div>`;

export const updateLogoInContent = (content: string, logoUrl: string): string => {
  if (typeof window === 'undefined') {
    return buildLogoHtml(logoUrl) + content;
  }
  const doc = new DOMParser().parseFromString(`<div>${content}</div>`, 'text/html');
  const container = doc.body.firstElementChild as HTMLElement | null;
  if (!container) return buildLogoHtml(logoUrl) + content;
  const logoSelector = 'img[data-email-logo="true"], img[alt="AGORA"], img[src*="agora_logo"]';
  const existingLogo = container.querySelector(logoSelector) as HTMLImageElement | null;
  if (existingLogo) {
    existingLogo.src = logoUrl;
    existingLogo.setAttribute('data-email-logo', 'true');
  } else {
    container.insertAdjacentHTML('afterbegin', buildLogoHtml(logoUrl));
  }
  return container.innerHTML;
};

export const updateLogoBackgroundInContent = (content: string, color: string): string => {
  if (typeof window === 'undefined') return content;
  const doc = new DOMParser().parseFromString(`<div>${content}</div>`, 'text/html');
  const container = doc.body.firstElementChild as HTMLElement | null;
  if (!container) return content;
  const logoSelector = 'img[data-email-logo="true"], img[alt="AGORA"], img[src*="agora_logo"]';
  const logoImg = container.querySelector(logoSelector) as HTMLImageElement | null;
  if (!logoImg) return container.innerHTML;
  const candidates: HTMLElement[] = [];
  let node: HTMLElement | null = logoImg;
  while (node && node !== container) {
    if (node.matches?.('td, div, table')) candidates.push(node);
    node = node.parentElement;
  }
  const selectTarget = () => {
    for (const candidate of candidates) {
      const style = candidate.getAttribute('style') || '';
      if (!/background-color\s*:/i.test(style)) continue;
      const hasBorderRadius = /border-radius\s*:/i.test(style);
      const hasPadding = /padding\s*:/i.test(style);
      const hasCenter = /text-align\s*:\s*center/i.test(style);
      const isFullWidthTable = candidate.tagName.toLowerCase() === 'table' && (candidate.getAttribute('width') === '100%' || /width\s*:\s*100%/i.test(style));
      if (!isFullWidthTable && (hasBorderRadius || hasPadding || hasCenter)) return candidate;
    }
    return candidates.find((c) => {
      const style = c.getAttribute('style') || '';
      const isFullWidthTable = c.tagName.toLowerCase() === 'table' && (c.getAttribute('width') === '100%' || /width\s*:\s*100%/i.test(style));
      return /background-color\s*:/i.test(style) && !isFullWidthTable;
    }) || null;
  };
  const target = selectTarget();
  if (!target) return container.innerHTML;
  const currentStyle = target.getAttribute('style') || '';
  const hasBackground = /background-color\s*:/i.test(currentStyle);
  const updatedStyle = hasBackground
    ? currentStyle.replace(/background-color\s*:\s*[^;"]+/i, `background-color: ${color}`)
    : `${currentStyle ? `${currentStyle}; ` : ''}background-color: ${color}`;
  target.setAttribute('style', updatedStyle);
  return container.innerHTML;
};

export const extractBodyContent = (html: string, logoUrl?: string): string => {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let bodyContent = bodyMatch ? bodyMatch[1] : html;
  if (logoUrl) {
    const logoRegex = /<img[^>]*src="[^"]*agora_logo_white[^"]*"[^>]*>/gi;
    bodyContent = bodyContent.replace(logoRegex, (match) => match.replace(/src="[^"]*"/, `src="${logoUrl}"`));
    if (!logoRegex.test(bodyContent)) {
      bodyContent = bodyContent.replace(/<img[^>]*alt="AGORA"[^>]*>/gi, (match) => match.replace(/src="[^"]*"/, `src="${logoUrl}"`));
    }
  }
  return bodyContent;
};

export const rebuildTemplate = (content: string, originalTemplate: string, logoUrl?: string): string => {
  const headMatch = originalTemplate.match(/([\s\S]*)<body[^>]*>/i);
  const bodyEndMatch = originalTemplate.match(/<\/body>([\s\S]*)/i);
  if (headMatch && bodyEndMatch) {
    let bodyContent = content;
    if (logoUrl) {
      const logoRegex = /<img[^>]*src="[^"]*agora_logo_white[^"]*"[^>]*>/gi;
      bodyContent = bodyContent.replace(logoRegex, (m) => m.replace(/src="[^"]*"/, `src="${logoUrl}"`));
      bodyContent = bodyContent.replace(/<img[^>]*alt="AGORA"[^>]*>/gi, (m) => m.replace(/src="[^"]*"/, `src="${logoUrl}"`));
    }
    return headMatch[1] + '<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">' + bodyContent + '</body>' + bodyEndMatch[1];
  }
  return originalTemplate;
};

export const extractPrimaryColor = (html: string): string => {
  const colorMatch = html.match(/background-color:\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})/i);
  return colorMatch ? colorMatch[1] : '#4F46E5';
};

export const defaultTemplates: Record<EmailTriggerType, string> = {
  user_registration: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a AGORA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">¡Bienvenido a AGORA!</h1>
  </div>
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hola {{user_name}},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Nos complace darte la bienvenida a AGORA. Estamos emocionados de tenerte como parte de nuestra comunidad.
    </p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Tu cuenta ha sido creada exitosamente. Ahora puedes comenzar a explorar nuestros productos y servicios.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboard_url}}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Comenzar a Explorar
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Si tienes alguna pregunta, no dudes en contactarnos.
    </p>
    <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
      Saludos,<br>
      El equipo de AGORA
    </p>
  </div>
</body>
</html>`,
  order_confirmation: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Pedido</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">¡Pedido Confirmado!</h1>
  </div>
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hola {{user_name}},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Gracias por tu compra. Hemos recibido tu pedido y lo estamos procesando.
    </p>
    <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #4F46E5;">Detalles del Pedido</h2>
      <p><strong>Número de Pedido:</strong> {{order_number}}</p>
      <p><strong>Fecha:</strong> {{order_date}}</p>
      <p><strong>Total:</strong> {{order_total}}</p>
      <p><strong>Método de Pago:</strong> {{payment_method}}</p>
    </div>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Te notificaremos cuando tu pedido esté en camino.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{order_url}}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Ver Pedido
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Si tienes alguna pregunta sobre tu pedido, contáctanos.
    </p>
  </div>
</body>
</html>`,
  order_status_change: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualización de Pedido</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">Actualización de Pedido</h1>
  </div>
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hola {{user_name}},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Tu pedido #{{order_number}} ha cambiado de estado.
    </p>
    <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Estado Anterior:</strong> {{previous_status}}</p>
      <p style="margin: 10px 0 0 0;"><strong>Estado Actual:</strong> <span style="color: #4F46E5; font-weight: bold;">{{current_status}}</span></p>
    </div>
    <p style="font-size: 16px; margin-bottom: 20px;">
      {{status_message}}
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{order_url}}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Ver Detalles del Pedido
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Gracias por confiar en AGORA.
    </p>
  </div>
</body>
</html>`,
  supervisor_notification: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificación para Supervisores</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #1d4ed8; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">{{event_title}}</h1>
    <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">{{business_name}}</p>
  </div>
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">{{event_description}}</p>
    {{detail_section}}
    {{action_url}}
    <p style="font-size: 12px; color: #6b7280; margin-top: 20px; text-align: center;">
      Notificación automática para supervisores.
    </p>
  </div>
</body>
</html>`,
};
