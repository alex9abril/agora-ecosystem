require('dotenv').config({ path: '.env' });
let url=process.env.DATABASE_URL;
console.log('raw',url);
if(url && url.includes('[') && url.includes(']')){
  const m=url.match(/postgresql:\/\/([^:]+):\[([^\]]+)\]@(.+)/);
  if(m){
    url=`postgresql://${m[1]}:${m[2]}@${m[3]}`;
  }
}
console.log('normalized',url);
