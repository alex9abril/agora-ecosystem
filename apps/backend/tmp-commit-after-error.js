const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
let url = process.env.DATABASE_URL;
if (url && url.includes('[') && url.includes(']')) {
  const m = url.match(/postgresql:\/\/([^:]+):\[([^\]]+)\]@(.+)/);
  if (m) url = `postgresql://${m[1]}:${m[2]}@${m[3]}`;
}
(async()=>{
  const pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false}});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    try{
      await client.query('select * from orders.order_status_history limit 1');
    } catch(e){
      console.log('expected error code', e.code);
    }
    try{
      const r=await client.query('COMMIT');
      console.log('commit ok', r.command);
    } catch(e){
      console.log('commit threw', e.code, e.message);
      await client.query('ROLLBACK');
    }
  } finally {
    client.release();
    await pool.end();
  }
})().catch(e=>{console.error(e);process.exit(1);});
