const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
let url = process.env.DATABASE_URL;
if (url && url.includes('[') && url.includes(']')) {
  const m = url.match(/postgresql:\/\/([^:]+):\[([^\]]+)\]@(.+)/);
  if (m) url = `postgresql://${m[1]}:${m[2]}@${m[3]}`;
}
(async()=>{
  const pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false}});
  try{
    const r=await pool.query("select table_schema,table_name from information_schema.tables where table_schema='orders' and table_name in ('order_status_history','orders') order by table_name");
    console.log(r.rows);
  } finally { await pool.end(); }
})().catch(e=>{console.error(e);process.exit(1);});
