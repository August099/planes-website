// Fondo de cada página (VA-56). Un solo lugar para cambiar qué imagen va en cada ruta.
// Las imágenes son WebP de 1920 px generadas con scripts/optimize-backgrounds.mjs.
// La Home no usa fondo estándar: tiene su propio hero.

export const PAGE_BACKGROUNDS = {
  planes: "/backgrounds/planes.webp",
  planeDetail: "/backgrounds/aircraft.webp",
  spareparts: "/backgrounds/spareparts.webp",
  publish: "/backgrounds/publish.webp",
  howtopublish: "/backgrounds/banner.webp", // bkg-publish2.png y bkg-banner.png son la misma imagen
  questions: "/backgrounds/questions.webp",
  faq: "/backgrounds/faq.webp",
  ads: "/backgrounds/ads.webp",
  banners: "/backgrounds/banner.webp",
  legal: "/backgrounds/privacidad.webp", // /terms y /privacy
  report: "/backgrounds/admin.webp", // bkg-qa.png y bkg-admin.png son la misma imagen
  login: "/backgrounds/login.webp",
  register: "/backgrounds/register.webp",
  profile: "/backgrounds/profile.webp",
  plans: "/backgrounds/plans.webp", // también 404, 403, error, mantenimiento y sin conexión
  admin: "/backgrounds/admin.webp",
  default: "/backgrounds/forms.webp", // /favs, /search, /services
} as const;

export type PageBackgroundKey = keyof typeof PAGE_BACKGROUNDS;
