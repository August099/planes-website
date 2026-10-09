/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Avisos de prueba que siguen en producción (VA-27): sacarlo cuando se reemplacen.
        protocol: 'https',
        hostname: 'loremflickr.com',
      },
      {
        protocol: "https",
        hostname: "**.supabase.co", // Permite URLs del storage de Supabase
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Solo afecta al servidor de desarrollo (túneles de loca.lt para probar en el celular).
  allowedDevOrigins: ['*.loca.lt'],
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  staticPageGenerationTimeout: 120,
};

module.exports = nextConfig;