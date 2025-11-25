/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // Google Maps API Key - puede venir de NEXT_PUBLIC_GOOGLE_MAPS_API_KEY o GOOGLE_MAPS_API_KEY
    // También busca en la raíz del proyecto
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 
      process.env.GOOGLE_MAPS_API_KEY ||
      (process.env.NODE_ENV === 'development' ? process.env.GOOGLE_MAPS_API_KEY : undefined),
    // Modo de desarrollo: deshabilita geocoding para evitar costos
    // Establece NEXT_PUBLIC_DISABLE_GEOCODING=true en .env.local para activar
    NEXT_PUBLIC_DISABLE_GEOCODING: process.env.NEXT_PUBLIC_DISABLE_GEOCODING || 'false',
  },
}

// Log para debugging (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('[next.config.js] Google Maps API Key configurada:', {
    hasNextPublic: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    hasGoogleMaps: !!process.env.GOOGLE_MAPS_API_KEY,
    finalValue: !!nextConfig.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    keyLength: nextConfig.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.length || 0,
  });
}

module.exports = nextConfig
