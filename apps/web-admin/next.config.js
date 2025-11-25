/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // Google Maps API Key - puede venir de NEXT_PUBLIC_GOOGLE_MAPS_API_KEY o GOOGLE_MAPS_API_KEY
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 
      process.env.GOOGLE_MAPS_API_KEY ||
      (process.env.NODE_ENV === 'development' ? process.env.GOOGLE_MAPS_API_KEY : undefined),
  },
}

module.exports = nextConfig

