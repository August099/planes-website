import type { Metadata } from "next";
import { Montserrat, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { AnalyticsBootstrap } from "@/components/analytics/AnalyticsBootstrap";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DeferredWidgets } from "@/components/ui/DeferredWidgets";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Fuentes de marca (VA-72): Montserrat para títulos e IBM Plex Sans para el cuerpo, servidas
// desde el propio sitio con next/font (antes: @import bloqueante a Google Fonts, más Space Grotesk
// e Inter que se descargaban sin usarse, y "IBM Plex Sans " con un espacio que la anulaba).
// Las dos son variables: un archivo por familia cubre todos los pesos.
const montserrat = Montserrat({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ventas Aeronáuticas | Aviones y repuestos aeronáuticos en Argentina",
    template: "%s | Ventas Aeronáuticas",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-AR"
      className={`${montserrat.variable} ${ibmPlexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
          <div className="flex-1">{children}</div>
        <Footer />
        <AnalyticsBootstrap />
        {/* Bandeja del comparador y bienvenida del lanzamiento, cargadas después de la página */}
        <DeferredWidgets />
        {/* VA-76: métricas reales de los usuarios (LCP, INP, CLS) en el panel de Vercel. */}
        <SpeedInsights />
      </body>
    </html>
  );
}