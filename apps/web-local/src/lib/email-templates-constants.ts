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
    variables: ['user_name', 'order_number', 'previous_status', 'current_status', 'status_message', 'order_url', 'delivery_detail_section'],
  },
  supervisor_notification: {
    name: 'Notificación para Supervisores',
    description: 'Se envía a los supervisores configurados cuando ocurre un evento (nueva venta, registro de cliente, cambio de estado)',
    variables: ['business_name', 'event_title', 'event_description', 'detail_section', 'action_url', 'action_label'],
  },
  password_recovery: {
    name: 'Recuperación de contraseña',
    description: 'Se envía cuando un usuario solicita restablecer su contraseña (enlace con token de Supabase)',
    variables: ['user_name', 'recovery_link', 'business_name', 'business_logo'],
  },
  custom_message: {
    name: 'Mensaje personalizado',
    description: 'Se envía manualmente desde el panel para contactar a un cliente',
    variables: ['subject', 'message_body', 'business_name', 'to_email'],
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
    {{delivery_detail_section}}
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
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #333333;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #333333;">
<tr>
<td align="center" style="padding: 40px 20px 60px 20px;">
<img src="https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png" alt="AGORA" data-email-logo="true" style="max-width: 200px; height: auto;" />
<p style="color: white; font-size: 14px; margin: 20px 0 0 0; opacity: 0.9; font-weight: 300; font-family: Arial, sans-serif;">La mejor solución de comercio en línea para la industria automotriz</p>
</td>
</tr>
<tr>
<td align="center" style="padding: 0 20px;">
<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px 16px 0 0;">
<tr>
<td style="padding: 50px 40px 40px 40px;">
<h1 style="text-align: center; font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 10px 0; line-height: 1.2; font-family: Arial, sans-serif;">{{event_title}}</h1>
<p style="text-align: center; font-size: 16px; color: #6b7280; margin: 0 0 30px 0; line-height: 1.6; font-family: Arial, sans-serif;">{{business_name}}</p>
<p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 30px 0; line-height: 1.6; font-family: Arial, sans-serif;">{{event_description}}</p>
{{detail_section}}
{{action_url}}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px;">
<p style="font-size: 14px; color: #1e40af; margin: 0; line-height: 1.5; font-family: Arial, sans-serif;">Este correo se envía automáticamente a los supervisores configurados para esta sucursal.</p>
</td></tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td align="center" style="padding: 0 20px;">
<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #f9fafb; border-radius: 0 0 16px 16px;">
<tr>
<td style="padding: 30px 40px; text-align: center;">
<p style="font-size: 12px; color: #9ca3af; margin: 0 0 10px 0; font-family: Arial, sans-serif;">Notificación automática para supervisores — no responder a este mensaje.</p>
<p style="font-size: 12px; color: #9ca3af; margin: 0; font-family: Arial, sans-serif;">© 2025 AGORA. Todos los derechos reservados.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`,
  password_recovery: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar contraseña</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #111827; color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <p style="margin: 0; font-size: 14px; opacity: 0.95;">{{business_name}}</p>
  </div>
  <div style="background-color: #f9fafb; padding: 28px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px;">Hola {{user_name}},</p>
    <p style="font-size: 16px;">Recibimos una solicitud para restablecer tu contraseña.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{{recovery_link}}" style="background-color: #111827; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
        Restablecer contraseña
      </a>
    </div>
    <p style="font-size: 13px; color: #6b7280; word-break: break-all;">{{recovery_link}}</p>
  </div>
</body>
</html>`,
  custom_message: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background-color: #111827; color: white; padding: 18px 20px; border-radius: 12px 12px 0 0;">
      <div style="font-size: 12px; opacity: 0.85; margin-bottom: 6px;">Mensaje de {{business_name}}</div>
      <div style="font-size: 18px; font-weight: 700;">{{subject}}</div>
    </div>
    <div style="background-color: white; padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
      {{message_body}}
      <div style="margin-top: 18px; font-size: 12px; color: #6b7280;">
        Si tienes alguna duda, responde a este correo.
      </div>
    </div>
  </div>
</body>
</html>`,
};
