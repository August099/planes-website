import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import SessionProvider from "@/components/ui/SessionProvider";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
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
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
          <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}