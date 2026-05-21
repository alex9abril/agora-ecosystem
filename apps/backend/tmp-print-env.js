require('dotenv').config({path:'.env'});
console.log({DATABASE_URL:process.env.DATABASE_URL, SUPABASE_URL:process.env.SUPABASE_URL, PORT:process.env.PORT});
