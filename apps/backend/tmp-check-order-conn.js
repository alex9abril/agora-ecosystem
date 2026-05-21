const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

function normalize(url){
  if(url && url.includes('[') && url.includes(']')){
    const m=url.match(/postgresql:\/\/([^:]+):\[([^\]]+)\]@(.+)/);
    if(m) return `postgresql://${m[1]}:${m[2]}@${m[3]}`;
  }
  return url;
}

(async()=>{
  let url = normalize(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString:url, ssl:{rejectUnauthorized:false} });
  try{
    const r = await pool.query("select current_database() as db, current_user as usr, inet_server_addr() as addr, inet_server_port() as port");
    console.log('conn', r.rows[0]);
    const id='a672074e-6158-4a16-892a-2963a75b6ff0';
    const q=await pool.query('select id,status,payment_status,updated_at,cancelled_at,cancellation_reason,frontend_origin from orders.orders where id=$1',[id]);
    console.log('order', q.rows[0]||null);
  } finally { await pool.end(); }
})().catch(e=>{console.error(e);process.exit(1);});
