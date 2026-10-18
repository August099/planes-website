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
  // Temporal (18/10/2026): la base de producción ya tiene el esquema nuevo (VA-150 a VA-158) y este
  // código es el anterior: toda página que lee la base daba error. Hasta el lanzamiento, todo lo que no
  // es la Home ("Próximamente"), un archivo (tiene punto), /_next o /api vuelve a la Home. 307: se
  // quita al mergear el sitio nuevo.
  async redirects() {
    return [{ source: "/:path((?!_next|api)[^.]+)", destination: "/", permanent: false }];
  },
};

module.exports = nextConfig;