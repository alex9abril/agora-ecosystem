/**
 * Confirma email de un usuario vía Supabase Admin API.
 * Uso: node -r dotenv/config scripts/013_confirm_email_dalton_agoramp.js
 * dotenv: DOTENV_CONFIG_PATH=apps/backend/.env
 */
const path = require('path');
const { createClient } = require(path.join(
  __dirname,
  '../apps/backend/node_modules/@supabase/supabase-js',
));

const USER_ID = '620edb17-63ce-45c3-aba8-ac5c24dfa960';
const EXPECTED_EMAIL = 'dalton@agoramp.mx';

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: before, error: getErr } = await supabase.auth.admin.getUserById(USER_ID);
  if (getErr) throw getErr;
  if (!before?.user) throw new Error('Usuario no encontrado');
  if (before.user.email !== EXPECTED_EMAIL) {
    throw new Error(`Email inesperado: ${before.user.email}`);
  }

  console.log('Antes:', {
    email: before.user.email,
    email_confirmed_at: before.user.email_confirmed_at,
    confirmed_at: before.user.confirmed_at,
  });

  const { data, error } = await supabase.auth.admin.updateUserById(USER_ID, {
    email_confirm: true,
  });
  if (error) throw error;

  console.log('Después:', {
    email: data.user.email,
    email_confirmed_at: data.user.email_confirmed_at,
    confirmed_at: data.user.confirmed_at,
    email_verified: data.user.user_metadata?.email_verified,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
