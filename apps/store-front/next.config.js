/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 
      process.env.GOOGLE_MAPS_API_KEY ||
      (process.env.NODE_ENV === 'development' ? process.env.GOOGLE_MAPS_API_KEY : undefined),
  },
  async rewrites() {
    return [
      // URLs limpias para presentaciones comerciales estáticas (public/*.html)
      { source: '/conocenos', destination: '/presentacion.html' },
      { source: '/proceso-blindado', destination: '/proceso-blindado.html' },
    ]
  },
}

module.exports = nextConfig

