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
  // Las guías se mudaron de /guias a /services/guides, con slugs en inglés (cambio sobre VA-78, 9/10).
  // permanent: true → 308.
  async redirects() {
    const guides: [string, string][] = [
      ["como-comprar-un-avion-usado", "buying-a-used-aircraft"],
      ["como-vender-tu-avion", "selling-your-aircraft"],
      ["transferencia-de-aeronaves-anac", "aircraft-transfer-anac"],
      ["glosario-aeronautico", "aviation-glossary"],
    ];
    return [
      { source: "/guias", destination: "/services/guides", permanent: true },
      ...guides.map(([from, to]) => ({ source: `/guias/${from}`, destination: `/services/guides/${to}`, permanent: true })),
    ];
  },
};

module.exports = nextConfig;