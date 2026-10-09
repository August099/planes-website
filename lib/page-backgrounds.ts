// Fondo de cada página (VA-56). Un solo lugar para cambiar qué imagen va en cada ruta.
// Las imágenes son WebP de 1920 px generadas con scripts/optimize-backgrounds.mjs a partir de
// los originales de assets/originals/ (fuera de public/).
// La Home no usa fondo estándar: tiene su propio hero.

export const PAGE_BACKGROUNDS = {
  planes: "/backgrounds/planes.webp",
  planeDetail: "/backgrounds/aircraft.webp",
  spareparts: "/backgrounds/spareparts.webp",
  publish: "/backgrounds/publish.webp",
  howtopublish: "/backgrounds/banner.webp",
  questions: "/backgrounds/questions.webp",
  faq: "/backgrounds/faq.webp",
  guides: "/backgrounds/faq.webp", // /guias y /guias/[slug] (VA-78)
  ads: "/backgrounds/ads.webp",
  banners: "/backgrounds/banner.webp",
  legal: "/backgrounds/privacidad.webp", // /terms y /privacy
  report: "/backgrounds/admin.webp",
  login: "/backgrounds/login.webp",
  register: "/backgrounds/register.webp",
  profile: "/backgrounds/profile.webp",
  plans: "/backgrounds/plans.webp", // también 404, 403, error, mantenimiento y sin conexión
  admin: "/backgrounds/admin.webp",
  default: "/backgrounds/forms.webp", // /favs, /search, /services
} as const;

export type PageBackgroundKey = keyof typeof PAGE_BACKGROUNDS;
