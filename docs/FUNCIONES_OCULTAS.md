# Funciones ocultas (VA-93)

Lo que está programado pero **no se publica** hasta nuevo aviso. Las rutas viven en
`app/_proximamente/`: en Next.js, una carpeta que empieza con `_` es **privada** y no genera rutas
(ver `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`, "Private folders").
El código sigue compilando y los modelos de la base, componentes y actions se mantienen.

**Regla general:** antes de empezar cualquier funcionalidad nueva que no sea de pagos, se pregunta si se
muestra o queda acá. Sin respuesta, queda oculta.

La rama `milton/actus` (VA-104) muestra todo esto; usa este documento como guía.

---

## Hangares (VA-84)

| | |
|---|---|
| Rutas ocultas | `app/_proximamente/hangars/page.tsx` (listado) · `app/_proximamente/hangars/hangar-details/[id]/page.tsx` (detalle) |
| URL pública | `/services/hangars` y `/services/hangars/hangar-details/<id>` → **404** |
| Se mantiene | Modelo `Hangar` y sus enums, `lib/hangars.ts` (`HANGARS_PATH`, `hangarPath`), `components/ui/HangarCard.tsx`, `components/ui/HangarFiltersSidebar.tsx`, `getHangarDetail` en `lib/listing-data.ts`, precios `HANGAR` |
| Accesos quitados | Menú de Servicios de escritorio (`components/ui/ServicesMenu.tsx`) y del celular (`NAV` en `components/ui/header-menu-shared.tsx`) |
| Nunca tuvo acceso | Sitemap, JSON-LD, búsqueda del header, Home, pestañas del perfil y de `/publish`, recomendaciones |

**Para volver a publicarlo:**
1. Mover `app/_proximamente/hangars` a `app/services/hangars`.
2. En `components/ui/header-menu-shared.tsx`, dentro de `sub` de Servicios, entre Guías y el comparador:
   `{ href: "/services/hangars", label: "Hangares" },`
3. En `components/ui/ServicesMenu.tsx`, importar `HANGARS_PATH` de `@/lib/hangars` y sumar como primer
   elemento de `SERVICE_TOOLS`:
   `{ title: "Hangares", href: HANGARS_PATH, links: [{ label: "Hangares en alquiler y venta", href: HANGARS_PATH, hint: "Espacios, hangares completos y venta" }] },`
4. En `/services` (`app/services/page.tsx`), sacar "Hangares y espacios" de `upcomingServices` y sumarlo a
   "Disponible ahora".
5. Sumar `/services/hangars` al sitemap (`app/sitemap.ts`) y, si corresponde, los detalles.
6. `npx next build` y verificar que `/services/hangars` responde 200.

---

## Banners publicitarios (VA-103, en standby)

| | |
|---|---|
| Rutas ocultas | `app/_proximamente/ads/page.tsx` ("Publicite su negocio") · `app/_proximamente/banners/page.tsx` ("Configurá tu banner") |
| URL pública | `/ads` y `/banners` → **404** |
| Se mantiene | Planes de tipo `AD_BANNER` en `/admin/plans` (la gestión del admin queda), cupones con alcance de banners |
| Accesos quitados | `/ads/:path*` y `/banners/:path*` del `matcher` de `proxy.ts` (si no, sin sesión mandaban al login en vez de dar 404). El link "Publicite su negocio" del footer ya estaba comentado (`components/ui/Footer.tsx`) |
| Ya estaba | `/ads` y `/banners` en `disallow` de `app/robots.ts` |

**Antes de volver a publicarlo:** VA-103 pide rehacer `/banners` (hoy tiene precio fijo, un
`external_reference` incorrecto y redirige a `/dashboard`) y consultar las secciones y el momento del
pago. **No** alcanza con mover la carpeta.

**Para volver a publicarlo (cuando VA-103 esté hecho):**
1. Mover `app/_proximamente/ads` a `app/ads` y `app/_proximamente/banners` a `app/banners`.
2. Volver a sumar `"/ads/:path*"` y `"/banners/:path*"` al `matcher` de `proxy.ts` (piden sesión).
   Descomentar el link "Publicite su negocio" del footer.
3. Decidir si salen del `disallow` de `app/robots.ts` y si van al sitemap.
4. `npx next build` y verificar que `/ads` y `/banners` responden 200.

---

## Sin código todavía (solo "Próximamente" en `/services`, sin link)

- Herramientas (VA-91), foro (VA-86), pilotos y profesionales, talleres, eventos y empresas.
  Cuando se programen, sus rutas nacen en `app/_proximamente/` y se anotan acá.

## Visible en Servicios

- **Guías** (`/services/guides`) y el **Comparador** (`/planes/compare`).
