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
        "/profile",
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
