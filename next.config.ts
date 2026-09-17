/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos", // Permite URLs de Picsum
      },
      {
        protocol: 'https',
        hostname: 'loremflickr.com',
      },
      {
        protocol: "https",
        hostname: "**.supabase.co", // Permite URLs del storage de Supabase
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
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
  experimental: {
    serverActions: {
      allowedDevOrigins: ['*.loca.lt', 'localhost:3000'],
      bodySizeLimit: "30mb", // Aumenta el límite a 10MB (o "20mb" si subes fotos muy pesadas)
    },
  },
  staticPageGenerationTimeout: 120,
};

module.exports = nextConfig;


