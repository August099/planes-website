import type { MetadataRoute } from "next";
import { BRAND_COLORS, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "VA",
    description: SITE_DESCRIPTION,
    lang: "es-AR",
    start_url: "/",
    display: "standalone",
    background_color: BRAND_COLORS.blue,
    theme_color: BRAND_COLORS.blue,
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
