# Email Sending - Backend (AGORA)

This document explains how registration emails are sent from the backend.

## Flow (User Registration)

1. `POST /auth/signup`
2. `AuthService.signUp()` creates the user in Supabase.
3. A confirmation link is generated (only when `requiresEmailConfirmation: true`).
4. `EmailService.sendWelcomeEmail()` is called with:
   - `EmailTriggerType.USER_REGISTRATION`
   - Variables: `user_name`, `dashboard_url` (confirmation link when available)
5. The email template is resolved using:
   - `communication.get_email_template(trigger_type, business_id, business_group_id)`

## Important Notes

- **Supabase email**: if the fallback uses `supabase.auth.signUp`, Supabase will still send its own confirmation email.
- **AGORA email** is sent by Nodemailer and only works if SMTP is configured.

## SMTP Configuration (Required)

These env vars must exist in `apps/backend/.env`:

```
SMTP_HOST=smtp.us.appsuite.cloud
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contacto@agoramp.mx
SMTP_PASSWORD=your_email_password
```

If `SMTP_PASSWORD` is missing, the transporter is not initialized and the email will not send.

## Neubox (Correo Empresarial) SMTP

According to Neubox's Outlook 365 IMAP guide, the SMTP settings for Correo Empresarial are:

- **Servidor de correo entrante (IMAP):** `imap.us.appsuite.cloud`
- **Puerto IMAP:** `993` (SSL habilitado)
- **Servidor de correo saliente (SMTP):** `smtp.us.appsuite.cloud`
- **Puerto SMTP:** `465` (SSL habilitado)
- **Usuario:** tu cuenta completa (ej. `usuario@tudominio.com`)
- **Contraseña:** la contraseña del correo empresarial

If you are using a domain email (not Gmail), do **not** use `smtp.gmail.com`.

## Templates

The registration email uses:

- `communication.email_templates`
- `trigger_type = 'user_registration'`

Required variables in the template:

- `{{user_name}}`
- `{{dashboard_url}}` (confirmation link when present)

## Troubleshooting Checklist

1. Verify SMTP credentials in `.env` (especially `SMTP_PASSWORD`).
2. Confirm the template exists in `communication.email_templates`.
3. Check logs for:
   - `Transporter no inicializado`
   - `No se encontró template`
   - `Error enviando correo`


