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
    const res = await pool.query(
      `select id,status,payment_status,updated_at,cancelled_at,cancellation_reason,frontend_origin
       from orders.orders where id=$1`,
      [id]
    );
    console.log('orders.orders', res.rows[0] || null);

    const hist = await pool.query(
      `select previous_status,new_status,change_reason,created_at
       from orders.order_status_history where order_id=$1 order by created_at desc limit 5`,
      [id]
    );
    console.log('history_count', hist.rowCount);
    console.log(hist.rows);
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
