const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

let url = process.env.DATABASE_URL;
if (url && url.includes('[') && url.includes(']')) {
  const m = url.match(/postgresql:\/\/([^:]+):\[([^\]]+)\]@(.+)/);
  if (m) url = `postgresql://${m[1]}:${m[2]}@${m[3]}`;
}

(async () => {
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const id = 'a672074e-6158-4a16-892a-2963a75b6ff0';
  try {
    const r = await pool.query(
      'select id,status,payment_status,updated_at,cancelled_at,cancellation_reason,frontend_origin from orders.orders where id=$1',
      [id]
    );
    console.log(r.rows[0] || null);
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
