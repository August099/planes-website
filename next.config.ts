/** @type {import('next').NextConfig} */
const nextConfig = {
  // Builds locales de verificación en otra carpeta (NEXT_DIST_DIR=.next-local), así no pisan la de
  // `next dev` (.next/dev): correr un build con el dev abierto dejaba las rutas /api en 404 y Auth.js
  // daba ClientFetchError. Sin la variable (Vercel y `npm run dev`), queda .next como siempre.
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
    // Probado y descartado (VA-76, 18/10): `inlineCss: true` mete el CSS en el HTML pero también lo
    // repite en los datos de la página; la Home pasaba de 48 KB a 127 KB comprimida en cada visita.
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
      // VA-96: las rutas de aeronaves pasan de /planes a /aircraft (la query string se conserva).
      { source: "/planes", destination: "/aircraft", permanent: true },
      { source: "/planes/compare", destination: "/aircraft/compare", permanent: true },
      { source: "/planes/plane-details/:id", destination: "/aircraft/:id", permanent: true },
      { source: "/guias", destination: "/services/guides", permanent: true },
      ...guides.map(([from, to]) => ({ source: `/guias/${from}`, destination: `/services/guides/${to}`, permanent: true })),
    ];
  },
};

module.exports = nextConfig;