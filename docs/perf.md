# Rendimiento — mediciones (VA-76)

Cómo se midió:
- **Servidor** (TTFB, HTML, cache-control): `node scripts/measure-pages.mjs http://localhost:3001` sobre el build de producción (`npm run build` + `npx next start -p 3001`, configuración `prod` en `.claude/launch.json`). En Git Bash anteponer `MSYS_NO_PATHCONV=1` si se pasan rutas.
- **Navegador** (JS, CSS, fuentes, imágenes): Resource Timing a 375 px, tamaños descomprimidos.
- **Base local** (`va_dev`): el TTFB local no incluye la latencia de red a Supabase; para eso ver VA-75.
- **LCP / TBT / Lighthouse**: el navegador integrado no reporta métricas de pintura con el panel oculto. Hay que correr Lighthouse en pre-production (ver abajo).

## Producción, antes de la fase (8/10/2026, ventasaeronauticas.com, celular emulado)

| Página | JS (descomprimido) | HTML | TTFB | Cache |
|---|---|---|---|---|
| `/` | 26.335 KB | 182 KB | 350–520 ms | `no-store` |
| `/planes` | 942 KB | 338 KB | 390–460 ms | `no-store` |
| `/spareparts` | 913 KB | 186 KB | 300 ms | `no-store` |
| Detalle de avión | 956 KB | 114 KB | 330–390 ms | `no-store` |
| `/terms` | 832 KB | 56 KB | 240–250 ms | `no-store` |

## Local, 9/10/2026 — antes de VA-71…VA-75 (después de VA-70 y VA-56)

| Página | HTML (gzip) | JS | CSS | Fuentes | Imágenes | Terceros | Cache |
|---|---|---|---|---|---|---|---|
| `/` | 190 KB (22) | 865 KB | 145 KB | 3 | 16 | Google Fonts, Supabase | `no-store` |
| `/planes` | 291 KB (26) | 843 KB | 141 KB | 3 | 3 | Google Fonts | `no-store` |
| `/spareparts` | 176 KB (19) | 813 KB | 136 KB | 3 | 3 | Google Fonts | `no-store` |
| Detalle de avión | 134 KB (18) | 858 KB | 145 KB | 3 | 8 | Google Fonts, Supabase | `no-store` |
| `/terms` | 56 KB (12) | 726 KB | 136 KB | 3 | 3 | Google Fonts | `no-store` |

## Local, 9/10/2026 — después de VA-71…VA-74

| Página | HTML (gzip) | JS | CSS | Fuentes | Imágenes | Terceros | Cache |
|---|---|---|---|---|---|---|---|
| `/` | 203 KB (22) | 875 KB | 130 KB | 2 | 4 | ninguno | `no-store` (tiene datos del usuario) |
| `/planes` | 221 KB (19) | 852 KB | 127 KB | 2 | 3 | ninguno | `no-store` |
| `/spareparts` | 173 KB (18) | 822 KB | 122 KB | 2 | 3 | ninguno | `no-store` |
| Detalle de avión | 130 KB (18) | 868 KB | 131 KB | 2 | 8 | Supabase (fotos) | `no-store` |
| `/terms` | 53 KB (11) | 735 KB | 122 KB | 2 | 3 | ninguno | **`s-maxage=31536000` (estática)** |
| `/faq` | 44 KB (8) | — | — | 2 | — | ninguno | **`s-maxage=31536000` (estática)** |

Lectura:
- **Páginas de texto estáticas** (VA-71): `/terms`, `/privacy`, `/faq`, `/howtopublish`, `/services`, `/plans`, `/register`, `/report`, `/ads` y las de error se sirven desde el CDN.
- **Fuentes** (VA-72): ya no hay pedidos a Google Fonts (eran CSS bloqueante); 2 archivos propios en vez de 3 + CSS externo.
- **Imágenes** (VA-73): la Home pide 4 imágenes de entrada en vez de 16 (logos con carga diferida y el hero solo baja la versión de su dispositivo).
- **HTML de `/planes`** (VA-74): 291 → 221 KB (gzip 26 → 19 KB). No llega a los 120 KB del plan; lo que queda es estructural (íconos SVG de cada card ~46 KB, clases ~67 KB, srcset de la primera foto ~31 KB). Para bajar más: 12 avisos por página en vez de 21, o cargar las fotos del carrusel aparte.
- **JS**: +~9 KB por página por el cliente de sesión del header (necesario para que las páginas puedan ser estáticas).

## Pendiente (VA-76)

1. **Lighthouse en pre-production** (https://planes-website-git-pre-production-diodo.vercel.app/), cuando se mergee esta rama: PageSpeed Insights (https://pagespeed.web.dev/) en modo celular sobre `/`, `/planes` y un detalle. Anotar acá Performance, LCP, TBT y CLS. Objetivo: Performance ≥ 85 en la Home, LCP < 2,5 s, TBT < 200 ms.
2. **Vercel Speed Insights**: requiere instalar `@vercel/speed-insights` y agregar `<SpeedInsights />` al layout, y activarlo en el panel de Vercel. No se instaló todavía (pide confirmación).
3. **Cachear datos de listados y detalles** (`unstable_cache` con tags, invalidados al publicar/editar/borrar/renovar/preguntar): siguen siendo dinámicos por los favoritos del usuario. Ahorra consultas a la base en cada visita.
