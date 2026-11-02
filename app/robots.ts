import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/publish",
        "/favs",
        "/questions",
        // 2/11: /profile se abrió; cada perfil decide con su meta robots (app/profile/[id]/page.tsx).
        "/login",
        "/register",
        "/verify-email",
        "/report",
        "/ads",
        "/banners",
        "/testmp",
        // Resultados de búsqueda internos
        "/search",
        // Pantallas de servicio, sin contenido propio
        "/panel",
        "/maintenance",
        "/offline",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
