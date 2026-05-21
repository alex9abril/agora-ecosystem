const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

(async()=>{
  const supabase = createClient(url, key, { auth: { autoRefreshToken:false, persistSession:false } });
  const userId = '7c81491b-39cc-426a-941e-e4e38920e368';
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) {
    console.error('admin.getUserById error', { message: error.message, status: error.status, code: error.code });
    process.exit(1);
  }
  console.log('email', data?.user?.email || null);
})().catch(e=>{console.error(e); process.exit(1);});
