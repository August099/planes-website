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
        hostname: "*.supabase.co", // Permite URLs del storage de Supabase
      },
    ],
  },
};

module.exports = nextConfig;
