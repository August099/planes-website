/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos", // Permite URLs de Picsum
      },
      {
        protocol: "https",
        hostname: "**.supabase.co", // Permite URLs del storage de Supabase
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      }
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb", // Aumenta el límite a 10MB (o "20mb" si subes fotos muy pesadas)
    },
  },
};

module.exports = nextConfig;


