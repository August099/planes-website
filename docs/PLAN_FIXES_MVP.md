# Plan de fixes y desarrollo — Ventas Aeronáuticas (MVP)

> **Para Claude Code.** Este documento sale de una auditoría del repo `planes-website` (8 de octubre de 2026).
> Ejecutalo **por fases y en orden**. Cada tarea tiene ID, archivos, problema, qué hacer y criterio de aceptación.
> Mercado Pago y facturación **quedan fuera** salvo la Fase 6, que es solo para más adelante.
> **Prioridad n.º 1 de los socios:** que **publicar un avión funcione perfecto** (VA-30). Todo lo que toque ese flujo va primero.
> **Fuentes:** el código local, la web en producción revisada en celular (375 px) y el documento de producto **"Composición de VA"** (en el proyecto de Claude; ver el anexo A al final). Cuando el anexo y este plan no coincidan, gana el anexo, salvo los puntos marcados ❓.

---

## 0. Reglas de trabajo (leer antes de empezar)

1. **Next.js 16.4 + React 19 + Prisma 7 (adapter `pg`) + Auth.js v5 beta.** Antes de tocar convenciones de Next, leé la guía correspondiente en `node_modules/next/dist/docs/` (lo pide `AGENTS.md`). Ejemplo: `middleware` ahora se llama `proxy`.
2. **Una tarea = un commit** con mensaje `fix(VA-XX): ...` o `feat(VA-XX): ...`. No mezcles tareas.
3. **Después de cada tarea corré** `npx tsc --noEmit` y `npm run lint`. No agregues errores nuevos. Al cerrar cada fase corré también `npx next build`, **sin** `prisma migrate deploy`: el script `build` de `package.json` lo ejecuta, así que usá `npx prisma generate && npx next build`.
4. **Cambios de schema:** siempre con `npx prisma migrate dev --name <nombre>`, nunca con `db push`. Mostrá el SQL generado antes de aplicarlo.
5. **Probá en mobile:** levantá `npm run dev` y revisá cada pantalla tocada a **375 px** y a **1280 px** de ancho.
6. **Si una tarea está marcada `❓ DECISIÓN`, frená y preguntá** antes de implementar. Las decisiones pendientes están en la sección 8.
7. No toques `.env`. Si falta una variable, decilo.
8. Antes de empezar corré `npx prisma generate`. El cliente generado en `node_modules/.prisma` está desactualizado respecto de `schema.prisma`: por ejemplo, `city`/`province` figuran como opcionales y `brand` en `SparePart` figura como obligatorio.
9. **Producción está atrasada respecto del código local.** En `ventasaeronauticas.com`, `/planes` todavía muestra la barra de filtros completa en celular, mientras que el código local ya tiene el drawer. Antes de dar algo por roto, comparalo con `npm run dev`. Al cerrar cada fase hay que desplegar.

---

## Resumen de prioridades

| Fase | Tema | Bloquea el lanzamiento |
|---|---|---|
| 1 | Seguridad y permisos (+ VA-09 SEO técnico) | **Sí** |
| 2 | Base de datos: migraciones, índices y consultas | **Sí** (2.1), el resto es importante |
| 3 | Bugs funcionales: **publicar avión (VA-30)**, registro por email (VA-20), etc. | **Sí** (VA-30, VA-20) |
| 4 | Lista del socio (UI/UX) | Sí, es lo que se ve |
| 5 | Responsive y limpieza | Sí (responsive), limpieza recomendada |
| 5b | **Rendimiento y tiempos de carga** | **Sí** (VA-70: la Home baja 6,5 MB de JavaScript) |
| 6 | Mercado Pago y facturación | No (más adelante) |

---

## FASE 1 — Seguridad y permisos (crítico)

### VA-01 · Server actions de publicaciones sin control de dueño
- **Archivos:** `app/actions/listing-actions.ts` (`renewListingAction` l.274, `deleteListingAction` l.339, `updateListingAction` l.361), invocadas desde `components/ui/ProfileView.tsx`.
- **Problema:** ninguna verifica sesión ni que el usuario sea el dueño. Cualquier persona, incluso sin loguearse, puede **borrar, editar o renovar cualquier publicación** llamando a la action con un `id`. Las server actions son endpoints públicos.
- **Hacer:**
  - Crear un helper `assertListingOwner(id, type)` en `lib/` que haga `getCurrentUser()` y busque el `sellerId`. Que lance un error si no coincide, salvo que el usuario sea admin.
  - Usarlo en las tres actions.
  - En `updateListingAction`, validar los inputs (año numérico, precio ≥ 0, etc.) y no aceptar `status` desde el cliente.
- **Aceptación:** un usuario B no puede borrar, editar ni renovar una publicación de A, y sin sesión cualquier intento falla.

### VA-02 · Acciones de cupones sin control de admin
- **Archivos:** `app/actions/coupons-actions.ts` (`getAdminCoupons`, `createAdminCoupon`, `toggleCouponStatus`, `generateRandomCouponCode`).
- **Problema:** no verifican `isAdmin`. Cualquiera puede crear un cupón de 100 % o activarlo.
- **Hacer:** agregar `verifyAdmin()` (mismo patrón que `admin-taxonomy-actions.ts`) al inicio de cada función. Reemplazar las primeras líneas `"server-only"; "use server";` por `"use server";` + `import "server-only";`, porque la string `"server-only"` como directiva no hace nada.
- **Aceptación:** llamar a esas actions sin ser admin devuelve error.

### VA-03 · Taxonomía de repuestos (grupos de filtros y filtros) sin control de admin
- **Archivo:** `app/actions/admin-taxonomy-actions.ts` l.274–335 (`createFilterGroupAction`, `updateFilterGroupAction`, `deleteFilterGroupAction`, `createFilterAction`, `deleteFilterAction`).
- **Hacer:** agregar `await verifyAdmin()` a cada una.

### VA-04 · Proxy/middleware que no se ejecuta
- **Archivo:** `app/middleware.ts`.
- **Problema:** está dentro de `app/` y en Next 16 la convención es `proxy.ts` en la **raíz** (ver `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`), así que hoy **no corre**. Además usa `getToken` con `NEXTAUTH_SECRET`, que en Auth.js v5 no coincide con el nombre de la cookie ni con el secreto (`AUTH_SECRET`).
- **Hacer:** mover a `/proxy.ts` usando `auth` de `@/lib/auth` (patrón `export default auth((req) => ...)` de Auth.js v5). Proteger `/publish`, `/favs`, `/questions`, `/ads`, `/banners` y `/admin`. Mantener igualmente los chequeos dentro de cada página y action: el proxy es una primera barrera, no la única.
- **Aceptación:** sin sesión, entrar a `/favs` redirige a `/login?callbackUrl=/favs`.

### VA-05 · Endpoints de prueba de Mercado Pago expuestos
- **Archivos:** `app/api/test-preference/route.ts`, `app/testmp/page.tsx`.
- **Problema:** `POST /api/test-preference` es público, crea un `Plan` y una `Purchase` y, si no hay sesión, usa **el primer usuario de la base**.
- **Hacer:** borrar ambos archivos. Cuando se haga la Fase 6 se arma el flujo real.

### VA-06 · Mail de "publicación asistida": relay de spam e inyección HTML
- **Archivo:** `app/publish/actions.ts` → `sendManagedListingEmail` (l.335).
- **Problema:** sin auth ni rate limit, interpola datos del usuario en HTML sin escapar, y los remitentes y destinatarios son placeholders (`tu-dominio.com`), así que **hoy no llega a nadie**.
- **Hacer:** exigir sesión o un rate limit simple por IP, escapar HTML y usar `EMAIL_FROM` y una nueva variable `SUPPORT_EMAIL`. Lo mismo para el `from`/`to` de `archiveAndPurgeOldAnalytics` en `app/admin/actions.ts` l.229.

### VA-07 · Validación de subida de archivos
- **Archivos:** `app/publish/actions.ts` (imágenes l.40–63), `app/actions/profile-actions.ts` (`updateAvatarAction`), `app/actions/admin-taxonomy-actions.ts` (`uploadBrandLogoAction`).
- **Problema:** las imágenes no validan tipo ni tamaño. La extensión sale de `file.name` (se puede subir `.html` o `.svg` a un bucket público). `bodySizeLimit` está en 30 MB.
- **Hacer:** whitelist `image/jpeg|png|webp`, máximo de 10 MB por imagen, extensión derivada del MIME y no del nombre, máximo de N imágenes por publicación (❓ DECISIÓN: sugerido 20). Subir en paralelo con `Promise.all` en vez de en serie.

### VA-08 · Reportes y preguntas sin validación
- **Archivos:** `app/api/reports/route.ts`, `app/actions/questions.ts`.
- **Hacer:** limitar el largo de `reason`/`details`/`question`/`answer` (por ejemplo 1000 caracteres), validar que exista el `aircraftId`/`sparePartId`, no devolver el objeto `report` completo y evitar que un vendedor se pregunte a sí mismo. En `answerQuestionAction`, setear `answeredAt: new Date()`, que hoy queda siempre en `null`.

### VA-09 · SEO: que Google entienda e indexe la web
**Estado medido en producción (8/10/2026):**
- `robots.txt` → 404, `sitemap.xml` → 404 y `manifest.webmanifest` → 404.
- **Todas las páginas tienen el mismo `<title>`** ("Ventas Aeronáuticas") y la misma descripción, que además es incorrecta ("Marketplace de aviones agrícolas en Argentina": la web es de todo tipo de aeronaves y repuestos).
- Sin `canonical`, sin Open Graph (al compartir un aviso por WhatsApp o Facebook no sale foto ni título), sin datos estructurados (JSON-LD).
- El `<h1>` del detalle de un avión es "Descripción General" en vez del nombre del avión.
- Los avisos pausados o vencidos responden 200 con un cartel, así que Google los puede indexar como páginas vacías.

**Hacer (en Next 16, revisar antes `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/metadata/` y la guía de `generateMetadata`):**
1. **Metadata base** en `app/layout.tsx`:
   - `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://ventasaeronauticas.com")`.
   - `title: { default: "Ventas Aeronáuticas | Aviones y repuestos aeronáuticos en Argentina", template: "%s | Ventas Aeronáuticas" }`.
   - Una descripción real (por ejemplo, "Comprá y vendé aviones, helicópteros y repuestos aeronáuticos en Argentina. Publicá gratis y contactá directo con el vendedor.").
   - `openGraph` (`siteName`, `locale: "es_AR"`, `type: "website"`), `twitter: { card: "summary_large_image" }`, `icons` y `lang="es-AR"` en `<html>`.
2. **Título y descripción propios en cada página pública** (`export const metadata` o `generateMetadata`): `/planes` ("Aviones en venta en Argentina"), `/spareparts` ("Repuestos aeronáuticos en venta"), `/faq`, `/howtopublish`, `/services`, `/terms`, `/privacy`, `/plans`, `/register`, `/login`.
3. **Detalle de avión y de repuesto con `generateMetadata`**:
   - Título del tipo "Cessna 182 1978 en venta – USD 120.000", con "Consultar precio" si no tiene precio.
   - Descripción armada con año, horas, categoría y ubicación (máximo ~155 caracteres).
   - `openGraph.images` = primera foto de la publicación.
   - `alternates.canonical` a la URL limpia.
   - Si la publicación está pausada, vencida o vendida: `robots: { index: false }`. Si no existe: `notFound()` (404 real).
   - Usar `React.cache` para que `generateMetadata` y la página no consulten la base dos veces.
4. **`<h1>` correcto:** en los detalles, el `<h1>` es el título del aviso. "Descripción General" pasa a `<h2>`. Hay un solo `<h1>` por página. Coordinarlo con VA-41.
5. **`app/robots.ts`:** permitir todo menos `/admin`, `/api`, `/publish`, `/favs`, `/questions`, `/profile`, `/login`, `/register`, `/report`, `/ads`, `/banners`, `/testmp` y `/search` (resultados internos). Incluir `sitemap: <metadataBase>/sitemap.xml`.
6. **`app/sitemap.ts`:** páginas públicas fijas + **todas las publicaciones activas y no vencidas** (aeronaves y repuestos), con `lastModified: updatedAt`. Reutilizar `activeListingWhere()` de VA-14 y elegir solo `id` y `updatedAt`. Revalidar cada hora.
7. **Canonical en listados con filtros:** `/planes?brand=...&page=2` → canonical a `/planes` (o a `?page=N` si hay paginación), para no generar miles de URLs duplicadas.
8. **Datos estructurados (JSON-LD con `<script type="application/ld+json">`):**
   - Home: `Organization` (nombre, logo, Instagram) + `WebSite` con `SearchAction` hacia `/search?q={search_term_string}`.
   - Detalle de avión y de repuesto: `Product` con `name`, `image`, `description`, `brand` y `offers` (`price`, `priceCurrency` USD o ARS según `inPesos`, `availability: InStock`, `itemCondition: NewCondition` o `UsedCondition`, `url`). Si el precio es "a consultar", omitir `price`. Agregar `BreadcrumbList` (Inicio → Aviones → Categoría → Aviso).
   - `/faq`: `FAQPage` con las preguntas y respuestas visibles en la página.
   - Validar con https://search.google.com/test/rich-results (anotar el resultado en el PR).
9. **Open Graph por defecto:** `app/opengraph-image.png` (1200×630, logo "VA//" sobre el fondo azul de la marca, generado con `ImageResponse` o una imagen estática) para las páginas sin foto propia.
10. **`app/manifest.ts`** (nombre, colores `#001F58`/`#E70F1F`, íconos) y `app/apple-icon.png`.
11. **`alt` útiles:** las fotos de los avisos usan "Foto del avión" genérico (`Carousel.tsx`, cards). Usar `"{título} – foto {n}"`.
12. **Dominio único:** verificar que `www.ventasaeronauticas.com` redirija con 301 a `ventasaeronauticas.com` (o al revés) en la configuración de dominios de Vercel. Todo el sitio usa el mismo en `metadataBase`.

**Opcional, cuando haya inventario (no ahora):** páginas de aterrizaje estáticas por marca, categoría o provincia (`/planes/marca/cessna`, `/planes/categoria/agricola`), con texto propio y `generateStaticParams`, para búsquedas como "Cessna 182 en venta Argentina". Y URLs con slug (`/planes/plane-details/cessna-182-1978-<id>`) con redirect 301 desde las actuales.

- **Aceptación:**
  - `/robots.txt` y `/sitemap.xml` responden 200 y el sitemap lista los avisos activos.
  - Cada página pública tiene `<title>` y `description` distintos.
  - Compartir un aviso por WhatsApp muestra foto, título y precio.
  - Rich Results Test sin errores en un detalle y en `/faq`.
  - Un aviso vencido tiene `noindex`.

**Fuera del código (lo hacen los socios):** dar de alta el dominio en **Google Search Console** y en **Bing Webmaster Tools**, enviar el sitemap, crear el perfil de **Google Business**, poner el link de la web en Instagram, Facebook y WhatsApp Business, y conseguir links desde aeroclubes, talleres y escuelas (ANAC/CAD). En SEO, los links de sitios del sector y el inventario real pesan tanto como el código.

---

## FASE 2 — Base de datos (pedido del desarrollador)

### VA-10 · Las migraciones no reflejan el schema (crítico para el deploy)
- **Confirmado:** los últimos cambios se aplicaron con `prisma db push`. `schema.prisma` define tablas y columnas que **no existen en ninguna migración** de `prisma/migrations/`: `Coupon`, `CouponUsage`, `AnalyticsEvent`, y las columnas `inPesos`, `isFoundingMember`, `rent`, `icon`, `logoUrl`, `discountType`, `aircrafts`, entre otras. El script `build` corre `prisma migrate deploy`, así que **una base nueva quedaría sin esas tablas** y, a partir de ahora, cada `migrate dev` va a querer resetear la base por la deriva.
- **Hacer (baseline sin perder datos):**
  1. Backup de la base de producción y de la de desarrollo (`pg_dump`).
  2. Comparar la base real contra el schema. En Prisma 7 la sintaxis de `migrate diff` cambió (`--from-config-datasource` / `--to-schema`): revisá `npx prisma migrate diff --help`. El resultado tiene que ser vacío o casi vacío. Si no lo es, mostrámelo antes de seguir.
  3. Generar la migración que cierra la brecha **entre las migraciones existentes y el schema** (`--from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`) y guardarla como `prisma/migrations/<timestamp>_baseline_db_push/migration.sql`. Revisarla a mano.
  4. **No ejecutarla** sobre bases que ya tienen esos cambios: marcarla como aplicada con `npx prisma migrate resolve --applied <timestamp>_baseline_db_push`, en desarrollo y en producción.
  5. Verificar con `npx prisma migrate status` que no queda nada pendiente.
  6. Sacar `prisma migrate deploy` del script `build` y dejar un script aparte, `"migrate:deploy": "prisma migrate deploy"`, para correr en el deploy de forma explícita.
  7. **Regla a partir de acá:** prohibido `db push` contra bases compartidas. Solo `migrate dev` en local y `migrate deploy` en producción. Dejarlo escrito en `README.md`.
- **Aceptación:** `migrate status` dice "Database schema is up to date" en ambas bases y una base vacía creada solo con `migrate deploy` levanta la app sin errores.

**Estado (8/10/2026):** hecho en local (commit `fix(VA-10)`). La migración `20261008145019_baseline_db_push` quedó marcada como aplicada en `va_dev` (copia local de producción); `migrate status` → up to date. Una base vacía (`va_empty`) con `migrate deploy` queda idéntica al schema y la app levanta. Backup: `C:\Users\pc\Documents\backups-va\va_prod_public_2026-10-08.dump`.

**Pendiente en producción (correrlo en el deploy, antes de desplegar este código):** en una PowerShell en la raíz del repo, apuntando solo esta sesión a producción (la variable de la sesión tiene prioridad sobre el `.env`; usar la conexión directa o el session pooler, puerto 5432, no el 6543):

```powershell
$env:DATABASE_URL = "<URL de producción, la que quedó comentada en el .env>"
npx prisma migrate status            # tiene que listar como pendiente solo 20261008145019_baseline_db_push
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
                                     # tiene que decir "No difference detected" (exit 0). Si no, FRENAR.
npx prisma migrate resolve --applied 20261008145019_baseline_db_push
npx prisma migrate status            # "Database schema is up to date!"
Remove-Item Env:DATABASE_URL         # volver a va_dev
```

- **No** correr `migrate deploy` antes del `resolve`: intentaría ejecutar la baseline sobre tablas que ya existen y fallaría.
- **Después del `resolve`**, con la misma sesión: `npm run migrate:deploy` aplica las migraciones nuevas (`20261008154932_va43_subcategorias`, `20261008155026_va44_campos_opcionales`, `20261008194327_va54_campos_nuevos` y `20261008225811_va11_indices`). `migrate status` tiene que terminar en "Database schema is up to date!". Hacelo **antes** de desplegar el código de VA-43/44.
- El `build` de Vercel ya no migra. Desde ahora, cuando un deploy traiga migraciones nuevas, correr `npm run migrate:deploy` contra producción (con el mismo `$env:DATABASE_URL`) antes de desplegar.

### VA-11 · Índices faltantes
Postgres **no** crea índices automáticos en las foreign keys y hoy faltan en las columnas más consultadas. Agregar en `schema.prisma` y migrar:

| Modelo | Índice | Por qué |
|---|---|---|
| `AircraftImage` | `@@index([aircraftId, order])` | Se trae en cada card y en cada detalle |
| `SparePartImage` | `@@index([sparePartId, order])` | Ídem |
| `Aircraft` | `@@index([sellerId])`, `@@index([categoryId])`, `@@index([status, listingExpiresAt, createdAt])` | Perfil, filtros, listado principal |
| `SparePart` | `@@index([sellerId])`, `@@index([categoryId])`, `@@index([status, inPesos, createdAt])` | Ídem |
| `AircraftEngine` / `AircraftPropeller` / `AircraftDocument` | `@@index([aircraftId])` | Detalle |
| `AnalyticsEvent` | `@@index([createdAt])` | El panel admin filtra solo por fecha y el índice `(eventType, createdAt)` no sirve para eso |
| `Lead` / `SparePartLead` | `@@index([aircraftId])` / `@@index([sparePartId])` | Contadores |
| `CouponUsage` | `@@index([userId])` | Perfil |
| `Account` / `Session` | `@@index([userId])` | Auth adapter |

Opcional, cuando haya volumen: búsqueda con `contains` sobre `title`/`description` hace `ILIKE '%x%'` (escaneo completo). Más adelante, `pg_trgm` + índice GIN o full-text de Postgres.

**Estado (8/10/2026):** ✅ hecho en local (commit `43316d9`). Migración `20261008225811_va11_indices` aplicada en `va_dev`: borra `Aircraft_status_idx` y `SparePart_status_idx` (quedan cubiertos por los compuestos) y crea los 17 índices de la tabla. `EXPLAIN` confirma su uso en el listado activo, las imágenes y el perfil. En producción la aplica `npm run migrate:deploy` (ver VA-10). La búsqueda con `pg_trgm` queda para más adelante.

### VA-12 · Consultas que traen tablas enteras a memoria (panel admin)
- **Archivo:** `app/admin/actions.ts`.
- **Problemas:**
  - `getDashboardOverview` (l.335) trae **todos** los eventos del período para armar el gráfico diario.
  - `getTrafficSourcesAnalytics` (l.653) trae todos los eventos.
  - `getOpportunitiesAnalytics` (l.731–751) trae todas las búsquedas, vistas y contactos, y compara cada término contra cada título (O(n·m)).
  - `getListingsAnalytics` (l.416) trae **todas** las publicaciones sin límite y hace `filter` por cada una (O(n·m)).
  - `getSearchesAnalytics` agrupa en JS.
  - `exportOldAnalyticsCSV` / `archiveAndPurgeOldAnalytics` traen todo de una.
- **Hacer:**
  - Agregar en SQL: `groupBy` de Prisma o `$queryRaw` con `date_trunc('day', "createdAt")` y `COUNT(*) ... GROUP BY`.
  - Para búsquedas: `metadata->>'query'` con `GROUP BY`.
  - En `getListingsAnalytics`, construir un `Map` por id en vez de `filter` dentro de `map` y paginar la lista (`take`/`skip`).
  - CSV/purga por lotes (cursor de 5.000).
  - En `getDashboardMetrics`, pasar los `await` secuenciales a un `Promise.all` y reemplazar `EXCHANGE_RATE_USD_ARS = 1200` hardcodeado por `lib/dolar.ts`. Marcar como "dato de ejemplo" o sacar `ebitda: 45`, `retentionRate: 78` y `cac: 15000`, que son inventados y se muestran como reales.


**Estado (9/10/2026):** ✅ hecho en local (commit `2bf14cc`). Todo agregado en la base: resumen y gráfico diario con `COUNT(*) FILTER` + `date_trunc`; tabla de publicaciones **paginada en el servidor** (10 por página) con Top 5 por `GROUP BY` y métricas en un `Map`; búsquedas y "sin oferta" con `GROUP BY` del término (`NOT EXISTS` contra títulos activos); tráfico agrupado por dominio del referrer (o `utm_source` si no hay referrer); CSV y purga leyendo de a 5.000 con cursor (el CSV suma visitante, referrer y UTM). KPIs: `Promise.all`, **dólar oficial de dolarapi** en vez de 1200 fijo (si la API falla, "Sin cotización") y EBITDA, retención y CAC muestran "Sin datos" (eran 45 %, 78 % y $15.000 inventados). Cambio de criterio: los contactos por publicación cuentan las consultas por formulario **del período** (antes, de toda la historia). Verificado en `va_dev`: vistas 471/212, 7 contactos, 88 búsquedas, 86 publicaciones y 9 páginas, igual que con SQL directo; "sin oferta" da el mismo resultado que la lógica vieja; el cursor lee los 787 eventos sin repetir.
### VA-13 · Consultas duplicadas o secuenciales en páginas públicas
- `app/page.tsx` l.26–48: **dos queries idénticas** de aeronaves (`take: 8` y `take: 6`). Hacer una sola con `take: 8` y usar `slice(0, 6)`.
- `app/planes/plane-details/[id]/page.tsx` y `app/spareparts/sparepart-details/[id]/page.tsx`: cuatro queries **en serie** (publicación, vendedor, favorito e insert de analytics). Incluir `seller` con `select` en el primer `findUnique`, correr el favorito en paralelo y sacar el insert de analytics del camino crítico con `after()` de `next/server` (ver docs). Tampoco registrar la vista si quien mira es el dueño.
- `components/ui/Header.tsx` l.27: en **cada página** se hace `auth()` + `question.count` con dos joins. Sumado al callback `jwt` de `lib/auth.ts` l.80, que consulta `isAdmin` en **cada request**, da como mínimo dos queries extra por página vista y deja todo el sitio en render dinámico.
  - En `jwt`, consultar `isAdmin` solo cuando `user` viene definido (login) o con `trigger === "update"`.
  - Mover el contador de preguntas a un componente cliente que lo pida una vez (o cachearlo 60 s).
- `app/planes/page.tsx` l.79: trae **todas** las imágenes de cada aeronave. Limitar a `take: 5` (lo que usa el carrusel de la card). La taxonomía completa (marcas → modelos → variantes) se consulta en cada request: cachearla con `unstable_cache`/`"use cache"` (ver docs de Next 16) e invalidarla con `revalidateTag` desde las actions de taxonomía.
- `app/search/page.tsx` l.54–71: `findMany` **sin paginación**. Agregar `take`/`skip` igual que en `/planes`.
- `components/ui/SparePartFiltersWrapper.tsx` y `app/spareparts/page.tsx` l.79: traen todas las categorías dos veces por request. Cachear.

**Estado (8/10/2026):** ✅ hecho en local (commit `70d9e19`). Todos los puntos, con estas precisiones:
- El insert de analytics del detalle ya no estaba en el render (lo sacó VA-17), así que no hizo falta `after()`.
- Caché con `unstable_cache` + tags en `lib/cached-data.ts` (el proyecto no usa `cacheComponents`; `"use cache"` queda para VA-71). Las actions de taxonomía invalidan con `updateTag`. Probado: renombrar una marca directo en la base no cambia `/planes` (cacheado); guardarla desde `/admin/taxonomy` sí, al instante.
- `jwt`: `isAdmin` se consulta al iniciar sesión, con `update()` o **cada 5 minutos** (no solo al loguear, para que quitarle el admin a alguien no tarde 30 días).
- Puntito de preguntas: cacheado 60 s por usuario, invalidado al preguntar o responder.
- `/search`: trae `página × 20` de cada tabla y las mezcla; probado que las páginas 1, 2 y 3 no se pisan.
- El vendedor del detalle ahora viene con `select` de campos públicos (antes se traía la fila entera, con `passwordHash`).

### VA-14 · Publicaciones vencidas que siguen apareciendo
- **Problema:** no hay ningún proceso que pase publicaciones a `EXPIRED`. `/planes` filtra por `listingExpiresAt`, pero **Home, `/spareparts`, `/search`, la búsqueda del header, el perfil público y el panel admin no**, así que se muestran vencidas.
- **Hacer:** crear un helper `activeListingWhere()` en `lib/listing-filters.ts` (`status: "ACTIVE"` + `listingExpiresAt >= now OR null`) y usarlo en todos esos lugares. Opcional: un cron (Vercel Cron o Supabase `pg_cron`) que marque `EXPIRED` una vez por día.

**Estado (8/10/2026):** ✅ hecho en local (commit `62ebcb8`). `activeListingWhere()` en Home, `/planes`, `/spareparts`, `/search`, buscador del header, perfil público (para quien no es el dueño) y panel admin (contadores de activas, publicadores activos y oportunidades). Además, el detalle de **repuesto** vencido o pausado muestra a terceros el mismo aviso que el de avión (`components/ui/listing/InactiveListingNotice.tsx`). Probado venciendo un avión y un repuesto en `va_dev`: desaparecen de todos esos lugares y vuelven al restaurar la fecha. El cron no se hizo (no hace falta para que no se vean). `lib/aircraft-service.ts` también filtra solo por `status` pero no se usa en ningún lado (para VA-61).

### VA-15 · Analytics que no mide lo que debería
- **Búsquedas:** `HeaderSearchBar.tsx` llama a `searchGlobal` con debounce de 350 ms y **cada llamada registra un evento `SEARCH`**. Escribir "cessna 182" genera eventos para "ce", "cess", "cessna", etc., y ensucia "búsquedas sin resultados" y "oportunidades". Registrar solo cuando el usuario envía la búsqueda (Enter, botón o clic en un resultado) o en la página `/search`.
- **Visitantes:** `anonymousId` solo se manda en búsquedas. Las vistas y los contactos no lo tienen, así que "visitantes únicos" en el admin es casi siempre 1. `referrer` y `utm*` **nunca se guardan**, así que "Fuentes de tráfico" siempre muestra "Directo". Hacer:
  - Una cookie `va_anon` (por ejemplo desde `proxy.ts`).
  - Capturar `utm_source/medium/campaign` y `document.referrer` en la primera visita (cookie de sesión).
  - Pasarlos a todos los `analyticsEvent.create`.
- **Conexión con el documento maestro:** esto es la base de "lo que dicen + lo que hacen + lo que buscan". Sin esto, el panel de oportunidades no sirve.


**Estado (9/10/2026):** ✅ hecho en local (commit `b0e2db6`). Cookies `va_anon` (1 año) y `va_src` (sesión: referrer externo + `utm_*`) desde `lib/analytics-client.ts` (`AnalyticsBootstrap` en el layout, y también al ver un detalle o contactar). El servidor las lee con `getAnalyticsContext()` (`lib/analytics-context.ts`) y las guarda en vistas, contactos, búsquedas y altas de publicaciones. Búsquedas: `searchGlobal` ya no registra; `logSearch` se llama solo con Enter, clic en un resultado o la página `/search` (`TrackSearch`, una vez por pestaña). `logContactClick` solo acepta PHONE/WHATSAPP/EMAIL. Arreglado de paso: Enter en el buscador de escritorio iba a `/planes?search=` (que no filtraba) y ahora va a `/search?q=`. Las vistas de anónimos se deduplican 30 min por `va_anon`.
### VA-16 · Integridad de favoritos
- `@@unique([userId, aircraftId, sparePartId])` **no evita duplicados** en Postgres, porque `NULL` se considera distinto. Doble clic rápido = favoritos duplicados.
- **Hacer:** reemplazar por dos índices únicos parciales (vía SQL en la migración): `UNIQUE (userId, aircraftId) WHERE aircraftId IS NOT NULL` y lo mismo con `sparePartId`. En `toggleFavoriteAction`, usar `deleteMany` y `create` con captura de `P2002`.


**Estado (9/10/2026):** ✅ hecho en local (commit `067b2c7`). Migración `20261009120000_va16_favoritos_unicos`: borra el índice `(userId, aircraftId, sparePartId)` y crea dos únicos, `(userId, aircraftId)` y `(userId, sparePartId)` (como `NULL` es distinto en Postgres, cada uno solo actúa sobre su tipo: equivale a los índices parciales y Prisma los entiende). `toggleFavoriteAction` hace `deleteMany` y, si no había nada, `create` tomando `P2002` como "ya es favorito". Aplicada en `va_dev` con `migrate deploy`. **Producción:** antes de `npm run migrate:deploy`, comprobar que no haya duplicados (si los hay, la migración falla): `SELECT "userId", "aircraftId", "sparePartId", count(*) FROM "Favorite" GROUP BY 1,2,3 HAVING count(*) > 1;`
### VA-17 · Vistas de publicaciones mal contadas (pedido del socio, 8/10)
- **Problema:** la vista se registra en el render del servidor de `plane-details` / `sparepart-details`. Cada nuevo render de la misma página suma otra: `router.refresh()`, server actions que revalidan (favorito, preguntas), volver atrás, prefetch y bots. En `va_dev` (copia de producción), 64 de 508 vistas repiten publicación y usuario a menos de 5 s; en las pruebas locales hubo ráfagas de 4 vistas en 1,5 s, todas del dueño.
- **Hacer:** contar la vista **solo cuando una persona entra al detalle**:
  - Sacar el `analyticsEvent.create` del render del servidor.
  - Componente cliente `TrackListingView` en el detalle que, al montar, llama a una server action `logListingView(type, id)` una sola vez por pestaña y publicación (`sessionStorage`, con try/catch).
  - En el servidor: validar que la publicación existe y está activa, no contar al dueño y no repetir la vista del mismo usuario en 30 minutos.
  - Los bots que no ejecutan JS dejan de contar solos.
- **Relacionado:** VA-15 (anonymousId, referrer, UTM) y VA-13 (detalle sin queries en serie).

**Estado (8/10/2026):** ✅ hecho en local (commit `0efcb83`). `components/ui/listing/TrackListingView.tsx` + `logListingView` en `app/actions/analytics-actions.ts`. Probado en `va_dev`: primera entrada al detalle +1; tres recargas +0; mismo usuario con `sessionStorage` borrado dentro de 30 min +0; el dueño +0; repuesto +1. Los anónimos sin `sessionStorage` (otra pestaña) suman de nuevo hasta que VA-15 agregue la cookie `va_anon`. Las vistas viejas duplicadas de producción no se tocan.

---

## FASE 3 — Bugs funcionales

### VA-20 · El registro con email y contraseña no permite entrar nunca (crítico)
**Estado (8/10/2026):** ✅ hecho en local (commit `ebb299e`). Probado con `delivered@resend.dev`: registro → mail → login bloqueado con aviso y reenvío (máx. 1/min) → `/verify-email` → login OK. Además se arregló que el formulario de login **nunca hidrataba** (`useSearchParams` dentro de `<Suspense>`), por lo que el login con contraseña no funcionaba y la contraseña viajaba en la URL; login y registro usan `method="post"`. Queda en `va_dev` el usuario de prueba `delivered@resend.dev` (verificado).
- **Archivos:** `app/actions/register-action.ts`, `lib/mail.ts`, `lib/auth.ts` l.65.
- **Problema:** el registro crea el usuario sin `emailVerified`, **no genera token ni manda el mail** (`sendVerificationEmail` no se usa en ningún lado) y **no existe la ruta `/verify-email`**. El login de credenciales rechaza a quien no tiene `emailVerified`, así que todo usuario registrado por email queda bloqueado.
- **Hacer:**
  1. En el registro, crear un `VerificationToken` (token aleatorio con `crypto.randomBytes`, vence en 24 h) y llamar a `sendVerificationEmail`.
  2. Crear `app/verify-email/page.tsx` que valide el token, setee `emailVerified`, borre el token y redirija a `/login?success=EmailVerified` (es el parámetro que ya espera `LoginForm.tsx` l.124).
  3. Agregar "Reenviar mail de verificación" en el login.
  4. En Auth.js v5, un `throw new Error("EmailNotVerified")` en `authorize` **no llega** como `res.error`. Usar una clase que extienda `CredentialsSignin` con `code = "EmailNotVerified"` y leer `res.code` en `LoginForm.tsx` l.42.
- **Aceptación:** registrarse, recibir el mail, confirmar, loguearse.

### VA-21 · El tipo de motor nunca se guarda
**Estado (8/10/2026):** ✅ cerrada con VA-43/VA-44: engineType sale de la categoría y no hay selector manual.
- **Archivo:** `app/publish/actions.ts` l.160.
- **Problema:** `isEngineTypeRequired` compara contra `"MP" | "BP" | "M" | "B"`, pero el formulario solo muestra el selector para `MP`/`BP` (`PublishForm.tsx` l.726), y esas categorías **ya dicen** si son pistón o turbohélice. Resultado: `engineType` es redundante o queda `null`.
- **Hacer:** se resuelve junto con VA-43 (subcategorías). Derivar `engineType` de la categoría (`MP`/`BP` → `PISTON`, `MT`/`BT` → `TURBOPROP`) y sacar el selector manual.

### VA-22 · Datos inventados al publicar
**Estado (8/10/2026):** ✅ hecho (commit `fix(VA-22)`); luego absorbido por el esquema de VA-30.
- `app/publish/actions.ts` l.174: si no se carga `certDate`, se guarda **la fecha de hoy**. Debe guardarse `null`.
- l.180: `passengers` vacío se guarda como `0`. Debe ser `null`.
- l.146–147: `parseInt` de año y horas vacíos da `NaN` y la query revienta con un error genérico. Validar del lado del servidor y devolver un mensaje claro.
- La categoría usa como fallback la **primera categoría que exista** (l.141) si la elegida no es válida, lo que guarda datos falsos. Mejor rechazar con error.

### VA-23 · Valores crudos de enums en pantalla
- `plane-details/[id]/page.tsx` l.353 muestra `USADO` y l.368 muestra `PISTON`. Lo mismo en `sparepart-details` l.338 y en la versión mobile.
- **Hacer:** usar `formatEnum` de `lib/constants.ts` con mapas para `AircraftCondition`, `EngineType` y `SparepartCondition`. Ojo: `SPARE_PART_CONDITION_LABELS` tiene `REMANUFACTURADO`, pero el enum es `RECORRIDO` y `REPARAR`. Corregir el mapa.
- Las búsquedas del header muestran siempre `USD` aunque el repuesto sea `inPesos` (`search-actions.ts` l.133).
- **Visto en vivo:** "Aeronaves destacadas" muestra "$551.007" (sin "US") y "Últimas publicaciones" muestra "US$ 180.500". Unificar con un helper `formatPrice(price, { inPesos })` en `lib/format.ts` y usarlo en todas las cards (`OverlayAircraftCard.tsx` l.52, `AircraftCard`, `SparePartCard`, `LatestListings`), en el detalle y en el PDF.

**Estado (8/10/2026):** ✅ hecho en local (commit `7c6f4ab`). `formatPrice` en `lib/format.ts` ("US$ 180.500" / "AR$ 1.249.999") en cards, detalles, PDFs y buscador del header (que ahora respeta `inPesos`). Etiquetas de estado unificadas en `lib/constants.ts` (`AIRCRAFT_CONDITION_LABELS`, `SPARE_PART_CONDITION_LABELS` con `RECORRIDO`/`REPARAR`); las usan el detalle, el filtro de repuestos, la card de repuesto y el PDF del avión, que mostraba `USADO` y `PISTON` crudos. El label de `RECORRIDO` sigue siendo "Recorrido" hasta que el socio confirme (❓ de VA-54). `profile-client.tsx` tiene su propio formato pero no se usa (VA-61).

### VA-24 · Condicionales que muestran "0"
- `{aircraft.totalTimeHours && ...}` (detalle, mobile y desktop) y `{engine.engineHours && ...}` renderizan un `0` suelto cuando el valor es 0. Cambiar por `!= null`. Es importante para VA-44, porque las horas pasan a ser opcionales.

**Estado (8/10/2026):** ✅ hecho en local (commit `254194f`). El detalle ya estaba bien desde VA-44/VA-57. Quedaban el PDF del avión (horas de motor y de hélice: con 0 la fila no aparecía; probado con un motor en 0 h) y el año de la card destacada.

### VA-25 · Imagen de fallback rota
- 14 lugares usan `"/placeholder.png"`, pero en `public/` solo existe `placeholder.svg`. Unificar con una constante en `lib/constants.ts`.

**Estado (8/10/2026):** ✅ hecho en local (commit `1640ad2`). `PLACEHOLDER_IMAGE = "/placeholder.svg"` en los 15 lugares. La card de "Aeronaves destacadas" pasó a `AppImage` (con `onError` → placeholder). Probado: el aviso de prueba con foto de loremflickr caída muestra el placeholder. Se sacó un `console.log` del carrusel de las cards.

### VA-26 · Rutas inexistentes
- `lib/auth-helpers.ts` → `requireCompleteProfile` redirige a `/completar-perfil`, que no existe, y además lee `sellerType`, que no está en el schema. No se usa: borrarla o reescribirla en VA-46.
- `types/next-auth.d.ts`: declara `SellerType` (no existe en Prisma) y `role` (no se usa), y el módulo `Session` está declarado dos veces. Dejar solo `id` e `isAdmin`.

**Estado (8/10/2026):** ✅ hecho en local (commit `607bc3b`). Tipos limpios (Session/User con `id` e `isAdmin`; JWT con `id`, `isAdmin` e `isAdminCheckedAt`) y fuera `requireCompleteProfile`. El lint bajó de 137 a 134 problemas. Barrido de links internos: `/plans` (enlazado en el footer) manda a `/checkout`, que no existe — es de la Fase 6, no se tocó; `/publicacion` y `/editar-publicacion` solo aparecen en `profile-client.tsx`, que no se usa.

### VA-27 · Datos de prueba en la base de producción (baja prioridad)
- En vivo hay publicaciones de prueba con imágenes de `loremflickr.com` que no cargan. **Los socios confirmaron que no importa**: se van a reemplazar por publicaciones reales. No borrar nada.
- Lo único que sí hay que corregir es el fallback `"/placeholder.png"`, que no existe (VA-25). Así, una publicación real sin foto o con una foto caída muestra el placeholder en vez de un ícono roto.

**Estado (10/10/2026):** ✅ cerrada sin cambios nuevos. El fallback ya se corrigió en VA-25 (commit `1640ad2`): `PLACEHOLDER_IMAGE = "/placeholder.svg"` en `lib/constants.ts`, y el archivo existe en `public/`. Las publicaciones de prueba de producción no se tocan (decisión de los socios). Cuando se reemplacen por avisos reales, sacar `loremflickr.com` de `images.remotePatterns` en `next.config.ts`.

### VA-28 · Textos sin tildes y detalles de copy (visto en vivo)
- `components/ui/SellerCta.tsx` l.24/29/38: "¿Queres vender tu aeronave?", "Publica en minutos y llega…" y "Publicar mi avion" → "¿Querés…?", "Publicá en minutos y llegá…" y "Publicar mi avión".
- `components/ui/Carousel.tsx`: "Pellizca o usa la rueda…" → "Pellizcá o usá la rueda…".
- Hacer una pasada de voseo y tildes en todos los textos visibles (`grep` de "Publica ", "Queres", "avion", "Busca ", etc.).

**Estado (8/10/2026):** ✅ hecho en local (commit `ec0a4b6`). Los textos del plan más una pasada por mensajes de error de las actions ("Debes/No tienes" → "Tenés que/No tenés"), placeholders, sin conexión, acceso denegado, preguntas, cupones, contraseña y panel admin (18 archivos). No se tocaron textos legales (`/privacy`, `/terms`) ni componentes que no se usan.

### VA-29 · Cinta "Próximamente" que tapa el título en `/services` (visto en vivo)
- `app/services/page.tsx` l.67–70: en celular la cinta diagonal se superpone a "Todo el ecosistema". Achicarla o moverla en mobile (por ejemplo, un badge arriba del título) y dejar la cinta diagonal solo desde `md:`.

**Estado (8/10/2026):** ✅ hecho en local (commit `d21ce1e`). Badge "Próximamente" arriba del título en celular y tablet; la cinta diagonal queda **desde `lg:`** (no `md:`), porque a 768 px rozaba la segunda línea del título. Revisado a 375, 768, 1024 y 1280 px.

### VA-30 · Flujo de publicación de avión a prueba de fallas (prioridad n.º 1)
**Estado (8/10/2026):** ✅ hecho en local (2 commits `fix(VA-30)`). Pendiente: probar en un celular real y la regla "Agrícola sin horas: OK", que depende de VA-44.
Revisando el flujo completo (`PublishForm.tsx` → `app/publish/actions.ts` → detalle → edición desde el perfil), estos puntos pueden hacer que **una publicación real falle o quede mal**:

1. **Las fotos se suben sin comprimir.** `lib/image-compressor.ts` (`compressImage`, con preset `listings` de 0,8 MB y 1920 px) **existe pero no se usa en ningún lado**. Diez fotos de celular (3–6 MB cada una) superan el `bodySizeLimit` de 30 MB y la publicación falla con "Ocurrió un error al guardar la publicación." **Confirmado: el sitio está en Vercel** (headers `server: Vercel`), donde el límite real del body de una función es de **4,5 MB**. Hoy, con 2–3 fotos de celular, la publicación ya falla. **Es probablemente el bug más importante del flujo de publicar.**
   - **Hacer:** comprimir en el cliente con `compressImages(files, "listings")` al elegir las fotos, mostrando el progreso.
   - **Necesario en Vercel:** subir las fotos **directo del navegador a Supabase Storage** con *signed upload URLs* generadas por una server action (`createSignedUploadUrl`) y mandarle a `createListing` solo las URLs. Así el tamaño del request deja de importar.
2. **Errores silenciosos al subir.** Si una imagen falla, se hace `continue` y la publicación se crea igual, con menos fotos o sin ninguna. Si falla alguna foto, abortar y avisar cuál. Si falla la creación en la base, **borrar las fotos ya subidas** (no dejar archivos huérfanos en el bucket).
3. **Sin validación en el servidor.** Todo se lee con `formData.get(...) as string`. Validar con un esquema (`zod`) compartido con el cliente: obligatorios según la categoría (VA-44), año entre 1900 y el actual, precio > 0 o "a consultar", entre 1 y 20 imágenes, JSON de motores y hélices bien formado. Devolver `{ ok: false, fieldErrors }` en vez de `throw`, y mostrar el error junto al campo en el formulario.
4. **`redirect()` dentro de la action + `await createListing()` en un `try/catch`** (`PublishForm.tsx` l.508–513). Verificar que el redirect a la publicación nueva funcione y que no termine mostrando "Ocurrió un error" ni el estado `isSuccess`. Lo más claro: que la action devuelva `{ ok: true, id }` y que el cliente haga `router.push`.
5. **Doble envío.** Deshabilitar el botón mientras `isPublishing`. Considerar una clave de idempotencia (un UUID generado al abrir el formulario y guardado en la publicación) para que un doble clic o un reintento no cree dos avisos.
6. **Datos inventados o perdidos:** `certDate` = hoy si está vacío, `passengers` = 0, categoría de fallback y `engineType` siempre `null` (VA-21 y VA-22). La marca de la hélice se concatena dentro de `model` (`PublishForm.tsx` l.495–498); va a su propio campo (VA-54).
7. **La edición no está a la par del alta.** El modal de edición del perfil (`ProfileView.tsx` → `updateListingAction`) **no permite** cambiar fotos, motores, hélices, marca, modelo ni categoría, y además no valida al dueño (VA-01). Reutilizar el mismo formulario de publicación en modo edición (`/publish?edit=<id>`) con la misma validación.
8. **Uso de cupones.** Las publicaciones gratis se van a manejar con un **cupón** (decisión de los socios). Hoy publicar no consume saldo ni cupón, así que no hay nada que tocar ahora. Ver la Fase 6 por el bug de cupones guardados.

- **Aceptación (probar a mano, en celular real y en desktop):**
  - Publicar un Monomotor Pistón con 10 fotos de celular sin comprimir (más de 30 MB en total): se publica, las fotos pesan menos de 1 MB cada una y redirige al detalle.
  - Publicar un Agrícola sin horas: OK. Un Monomotor sin horas: error junto al campo.
  - Cortar la red a mitad de la subida: mensaje claro, sin publicación a medias en la base ni archivos huérfanos.
  - Doble clic en "Publicar": una sola publicación.
  - Editar la publicación desde el perfil cambiando una foto y el motor: se guarda.
  - Otro usuario no puede editarla (VA-01).

### VA-31 · El filtro de la Home no queda reflejado en `/planes` (pedido del socio, 8/10)
- **Problema:** filtrar en la Home por marca "Cessna" lleva a `/planes?brand=…` con solo Cessnas, pero la barra de filtros no muestra nada seleccionado: la sección "Marca" está cerrada y solo hay un puntito. Además el precio de la Home manda `price=0-100k`, que `/planes` ignora (lee `minPrice`/`maxPrice`).
- **Hacer:**
  - `HomeFilter.tsx`: traducir los rangos de precio a `minPrice`/`maxPrice`.
  - `PlanesFiltersSidebar.tsx`: abrir de entrada las secciones que tienen filtros activos y desplegar las marcas tildadas. Mostrar arriba los filtros activos como etiquetas que se pueden quitar ("Cessna ×").
  - Resincronizar el estado cuando cambia la URL (por ejemplo, volver atrás o la búsqueda del header), no solo al montar.

**Estado (8/10/2026):** ✅ hecho en local (commit `24deb1f`). Probado: Home → Cessna + "Más de USD 300.000" → `/planes?brand=…&minPrice=300000` con 1 resultado, etiquetas "Desde USD 300.000" y "CESSNA", secciones Precio y Marca abiertas, Cessna primera y tildada. Quitar la etiqueta CESSNA actualiza la URL y el listado (25). A 375 px el panel de filtros muestra lo mismo. Los modelos y variantes se quitan junto con su marca.


### VA-32 · Galería del detalle sin fondo propio (pedido del socio, 9/10)
- **Problema:** el componente de imágenes del detalle de avión y de repuesto (`AircraftGallery` en `components/ui/Carousel.tsx`) no tiene fondo: alrededor de la foto (que usa `object-contain`) y en la tira de miniaturas se ve el fondo de la página. El resto de las tarjetas del detalle son `bg-white` con `border-slate-200`.
- **Hacer:** mismo fondo que las demás tarjetas (`bg-white`, borde `slate-200`, `rounded-2xl`, `shadow-sm`) en el contenedor de la foto y en la tira de miniaturas. Ver a 375 y 1280 px con fotos horizontales y verticales.

**Estado (9/10/2026):** ✅ hecho en local (commit `3ec45a0`). Contenedor y tira de miniaturas en `bg-white` (borde `slate-200`, igual que las demás tarjetas). Además, las miniaturas tienen desde el primer render el mismo ancho que calcula Swiper (5 / 7 / 9 por fila): antes de inicializarse, la primera ocupaba todo el ancho. Verificado a 375 px (57 px, 5 visibles) y 1280 px (79,3 px, 9 visibles). Aplica al detalle de avión y al de repuesto (mismo componente).

### VA-33 · El tipo de vendedor ("Publica") no se completa bien (visto el 9/10)
- **Problema:** el filtro "Publica" de VA-45 usa `User.userType` (`PARTICULAR` / `RESELLER` / `FACTORY`), pero:
  - Solo se carga en el registro con email, con dos opciones: "Particular" y "Empresa / Taller / Broker" (→ `RESELLER`). **`FACTORY` nunca se puede elegir.**
  - Quien entra con **Google** queda siempre `PARTICULAR` (valor por defecto) y nadie se lo pregunta. En `va_dev`: 9 de 13 `PARTICULAR` son cuentas de Google.
  - No se puede cambiar después: "Ajustes" del perfil no lo tiene.
  - El perfil muestra el valor crudo (`PARTICULAR`) en vez de una etiqueta.
- **Solución propuesta:**
  1. Etiquetas únicas en `lib/constants.ts` (`USER_TYPE_LABELS`: Particular / Intermediario (empresa, taller, broker) / Fábrica) y usarlas en el registro, el perfil, el filtro y el admin.
  2. **Registro:** el select pasa a tener las tres opciones y se guarda tal cual (sin el mapeo `COMPANY` → `RESELLER`).
  3. **Perfil → Ajustes:** campo "Tipo de cuenta" editable, con validación en el servidor (solo el propio usuario, valor del enum).
  4. **Cuentas de Google (y las existentes):** campo nuevo `userTypeConfirmed` (boolean). Se marca en el registro con email y al guardar el tipo en Ajustes. Si no está confirmado, **antes de publicar** `/publish` pregunta "¿Quién publica?" (mismo select) y lo guarda junto con la publicación. Para las cuentas actuales con contraseña, la migración lo marca como confirmado (ya lo eligieron al registrarse).
  5. **Admin:** mostrar y poder corregir el tipo en `/admin/users` (VA-58), por si alguien se equivoca.
  6. Mientras haya cuentas sin confirmar, el filtro "Publica" puede dar resultados incompletos: opcionalmente mostrar el filtro recién cuando la mayoría de los vendedores con avisos estén confirmados.
- **Migración:** `ALTER TABLE "User" ADD COLUMN "userTypeConfirmed" BOOLEAN NOT NULL DEFAULT false` + `UPDATE ... SET true WHERE "passwordHash" IS NOT NULL` (mostrar el SQL antes de aplicar).

**Estado (10/10/2026):** ✅ hecho en local. La mayor parte salió con **VA-87** (commit `839c15c`): etiquetas en `lib/user-types.ts`, tipo editable en "Mi perfil", `userTypeConfirmed` con su migración y la pregunta después del primer login con Google. Las opciones del usuario quedaron en dos ("Particular / Privado" y "Empresa / Taller / Broker"), como pidió el socio en VA-87. **Commit `597f2d8`** completa lo que faltaba: (4) **antes de publicar**, si el tipo no está confirmado (cuentas de Google anteriores a VA-87), `/publish` lleva a "¿Quién publica?" (`/onboarding/account-type?from=publish`, destino fijo) y vuelve a publicar; en la edición de un aviso no pregunta. (5) **Admin:** columna "Tipo de cuenta" en `/admin/users` con los tres tipos ("Fábrica" solo se asigna desde ahí) y aviso "Sin confirmar"; guardar lo marca como confirmado (`setUserTypeAction`). **No se hizo** el punto 6 opcional (ocultar el filtro "Publica" mientras haya cuentas sin confirmar). **Verificado** en el build de producción con un usuario de prueba sin confirmar: `/publish` → "¿Quién publica?" → elegir → vuelve a `/publish`, y la segunda vez ya no pregunta; en el admin, cambiar a Fábrica se guarda y queda confirmado. El usuario de prueba quedó como estaba.

### VA-34 · "Compartir" siempre con ventana flotante (pedido del socio, 9/10)
- **Problema:** cada botón de compartir hacía algo distinto: en las cards, menú nativo del celular o copiar el link sin avisar en escritorio; en el detalle, menú nativo si existía.
- **Hacer:** un solo componente de ventana flotante para cards (avión y repuesto) y detalle, en celular y escritorio.

**Estado (9/10/2026):** ✅ hecho en local (commit `4de0300`). `components/ui/ShareDialog.tsx` (WhatsApp, Facebook, X, email y copiar enlace): hoja inferior en celular y ventana centrada desde `sm`, `role="dialog"`, Escape y X de 44 px. Se eliminaron las tres copias del modal. Probado: card de avión a 375 px, card de repuesto y detalle a 1280 px; abrir no navega al detalle.
---

## FASE 4 — Lista del socio

> Cada ítem dice cómo lo interpreté. Si la interpretación no es clara, está marcado ❓.

### VA-40 · Logo de inicio en celular → "VA//" en blanco
- **Archivo:** `components/ui/header-logo.tsx` l.24–33.
- **Visto en vivo:** en celular solo se ven las dos barras "//". `logo-mark.svg` es solo el isotipo de barras (no tiene "VA"), y el único "VA//" que hay en `public/` es `logo-mark-background.png` (azul, sobre fondo blanco, 1920×1080).
- **Ya hecho:** generé `public/logo-va-white.png` (1032×276, fondo transparente, "VA" y la barra derecha en blanco, la barra izquierda en rojo de marca), extraído de `logo-mark-background.png`. Es un **borrador**: si el socio genera la versión final, se reemplaza el archivo con el mismo nombre.
- **Hacer:**
  - En mobile, sobre la Home (fondo oscuro): `logo-va-white.png`.
  - En mobile, en el resto de las páginas (fondo blanco): `public/logo-va-color.png` ("VA" azul, barra roja y barra azul, fondo transparente; también es un borrador generado del mismo archivo).
  - Tamaño: alto 32–36 px, `width`/`height` reales en el `Image` (aspecto ≈ 3,74:1) y no 20×20.
- **Aceptación:** a 375 px, en la Home se lee "VA//" en blanco y en `/planes` se lee "VA//" en color.


**Estado (9/10/2026):** ✅ hecho en local (commit `a41e6d2`). Header en celular: `logo-va-white.png` sobre la Home y `logo-va-color.png` en el resto, 34 px de alto con la proporción real (1032×276). Siguen siendo **borradores**: si el socio manda el logo final, se reemplazan los archivos con el mismo nombre.
### VA-41 · Ordenar los campos de las publicaciones en celular
- **Archivos:** `app/planes/plane-details/[id]/page.tsx`, `app/spareparts/sparepart-details/[id]/page.tsx`.
- **Confirmado en vivo:** el orden en mobile es fotos → **descripción** → título y precio → datos → vendedor → ficha técnica, que **repite** marca, modelo y año. El título y el precio quedan debajo de una descripción larga.
- **Hacer (orden mobile):** fotos → título + precio + acciones (favorito, compartir, PDF) → datos clave en grilla de 2 columnas (año, horas, categoría, ubicación, condición) → contacto del vendedor (botones grandes) → descripción → ficha técnica (motor, hélice, aviónica, interior/exterior, sin repetir lo de arriba) → documentos → preguntas.
  - Implementarlo con un solo árbol de componentes y clases `order-*`/`lg:` en vez de duplicar bloques `lg:hidden` / `hidden lg:block`.
  - Extraer `AircraftKeyFacts`, `SellerContactCard` y `TechSheet` como componentes.
  - En `DetailRow`, en mobile, label y valor en la misma fila (label 40 %) para textos cortos y apilados solo si `multiline`.
- Según la composición: en la categoría **Bimotor** no se muestra el recuadro "Datos de motor" a la derecha de las fotos (abajo sigue todo igual). Hoy depende de `hasSingleEngine`. Atarlo a la categoría (`BP`/`BT`).
- **Aceptación:** a 375 px, sin scrollear, se ve foto + título + precio.

**Estado (9/10/2026):** ✅ hecho en local (commit `bbb3f74`). Un solo árbol en los dos detalles: las columnas son `contents` en celular y los bloques se ordenan con `order-*` (fotos → título/precio/acciones → vendedor → descripción → ficha → documentos); fuera las copias `lg:hidden` / `hidden lg:flex`. Componentes nuevos `KeyFacts` (datos clave en grilla 2 columnas) y `SellerContactCard`. La ficha web ya no repite "General" ni los datos del motor del recuadro (`aircraftSections` / `sparePartSections` con `omitSummary`); la impresión usa la ficha completa. Recuadro "Motor" atado a la categoría (`showsEngineSummary`: un motor y no Bimotor). Verificado: a 375 px el precio termina en 669 px (avión) y 725 px (repuesto) de 812; a 1280 px las dos columnas quedan como antes; un BP con un solo motor ya no muestra el recuadro. **No se hizo** el cambio de `DetailRow` (label 40 % en la misma fila): las tablas de la ficha se leen bien a 375 px.

### VA-42 · Zoom de imágenes: pantalla completa al tocar y X arriba a la derecha
- **Archivo real:** `components/ui/Carousel.tsx`, que es el que usan los detalles. `components/ui/AircraftGallery.tsx` está **sin usar** y hay que borrarlo.
- **Confirmado en vivo:** tocar la foto no hace nada y el botón tiene `opacity: 0`.
- **Causa:** el botón para abrir la pantalla completa (l.146–153) tiene `opacity-0 group-hover:opacity-100`. **En celular no hay hover, así que el botón es invisible** y no hay forma de abrir el visor.
- **Hacer:**
  - Al tocar o hacer clic en la imagen (cuando el zoom es 1×), abrir el lightbox. Ojo: no confundir con el swipe de Swiper (usar `onClick` de Swiper o comparar distancia del pointer).
  - El botón de maximizar, siempre visible en touch.
  - En el lightbox: X fija arriba a la derecha (con `env(safe-area-inset-top)`), pinch-zoom (ya está el módulo `Zoom`), doble tap para zoom, swipe entre fotos, `Escape` para cerrar en desktop, `role="dialog"` y `aria-modal`.
  - Reemplazar el texto "Pellizca o usa la rueda" por "Pellizcá…".
  - Bug extra: en desktop, el listener de `wheel` del carrusel principal (l.70–77) **secuestra el scroll** hacia arriba sobre la foto y hace zoom en vez de scrollear la página. Quitar el zoom con rueda del carrusel principal y dejarlo solo en el lightbox.

**Estado (9/10/2026):** ✅ hecho en local (commit `a81c824`). Tocar/clic en la foto abre el visor (`onClick` de Swiper: no se dispara al deslizar ni en las flechas); botón de maximizar visible en táctil (44 px, `aria-label`). Sin zoom con rueda en el carrusel principal. Visor con `role="dialog"`, `aria-modal`, foco en la X, `Escape`, flechas del teclado, doble toque/clic para zoom, X de 44 px con `safe-area-inset-top`. Probado a 375 px con clics reales: la flecha no abre, tocar la foto abre, `Escape` cierra y devuelve el scroll, deslizar cambia de foto sin abrir. Borrado `components/ui/AircraftGallery.tsx` (no se usaba).

### VA-43 · Subcategorías Pistón / Turbohélice dentro de Monomotor y Bimotor
**Estado (8/10/2026):** ✅ hecho en local (commit `feat(VA-43)` + parte del formulario en `feat(VA-44)`). Migración `20261008154932_va43_subcategorias` aplicada en `va_dev`.
- **Estado en producción (visto en vivo):** las categorías son `A` Agrícola, `BP` "Bimotor", `E` Experimental/LSA, `H` Helicóptero, `MP` "Monomotor", `PR` Proyecto y `S/C` "Sin categoría asignada". **No existen `MT` ni `BT`.** El seed (`seed_data.json`) sí los tiene, así que la base y el seed están desalineados.
- **Lo que pide la composición (anexo A):** Monomotor → Pistón | Turbohélice; Bimotor → Pistón | Turbohélice; el resto, sin subcategoría. Los filtros tienen que permitir combinar.
- **Hacer (manteniendo los ids existentes, sin romper publicaciones):**
  1. Migración de datos: renombrar `MP` → "Monomotor Pistón" y `BP` → "Bimotor Pistón", y crear `MT` "Monomotor Turbohélice" y `BT` "Bimotor Turbohélice".
  2. Hacer un listado de las publicaciones actuales en `MP`/`BP` que en realidad son turbohélice (por modelo, con el mapeo del anexo A) y **mostrármelo antes de moverlas**.
  3. Un mapa único en `lib/aircraft-categories.ts`, `{ id, group: "Monomotor" | "Bimotor" | ..., engine?: "PISTON" | "TURBOPROP" }`, usado por el formulario, los filtros, las cards, el detalle y el PDF.
  4. **Formulario:** paso "Tipo" (Monomotor, Bimotor, Agrícola, Helicóptero, Experimental/LSA, Proyecto). Si es Monomotor o Bimotor aparece "Motorización: Pistón | Turbohélice" y se resuelve a `MP`/`MT`/`BP`/`BT`. Si el modelo elegido tiene categoría por defecto, se preselecciona.
  5. **Filtros** (`PlanesFiltersSidebar.tsx`): "Monomotor" con hijos "Pistón" y "Turbohélice". Tildar el padre = ambos hijos.
  6. Derivar `engineType` de la categoría y sacar el selector manual (cierra VA-21).
  7. "Sin categoría asignada" (`S/C`): no mostrarla como filtro público, o renombrarla a "Otros". ❓
- **Seed y modelos:** `prisma/seed-taxonomy.ts` **ignora** el campo `category` de cada modelo del JSON, así que los modelos quedan sin `defaultCategoryId`. Además hay dos errores de parseo en `seed_data.json`: `"JET) (S/C"` (Citation) y `"PISTÓN Y TURBOHÉLICE) (BP"` (Aero Commander). Corregirlos y setear `defaultCategoryId` en el seed. Ojo: en el anexo hay muchas variantes marcadas `(PR)` (por ejemplo "PA-28 Cherokee (PR)", "King Air 90 (PR)", "AT-802 A (PR)"). Por la nota del documento ("*Modelos próximos a utilizar cuando haya cierto movimiento…") parecen significar **"para más adelante"** y no "Proyecto". ❓ DECISIÓN: confirmar antes de asignarles la categoría Proyecto.

### VA-44 · Campos obligatorios por categoría (horas, aviónica)
**Estado (8/10/2026):** ✅ hecho en local (commit `feat(VA-44)`). Migración `20261008155026_va44_campos_opcionales` aplicada en `va_dev`. TBO también opcional en PR (D16), así que `AircraftEngine.TBO` pasó a `Int?`.
- **Archivos:** `components/ui/PublishForm.tsx` l.386 (`validateStep`), `app/publish/actions.ts`, `app/actions/listing-actions.ts` (update), `prisma/schema.prisma`.
- **Reglas de la composición (anexo A):**

| Campo | Obligatorio | Excepciones (opcional) |
|---|---|---|
| Horas totales | Sí | Agrícola (`A`), Experimental/LSA (`E`), Proyecto (`PR`) |
| Aviónica: descripción | Sí | Agrícola (`A`), Proyecto (`PR`) |
| Motor: TBO | Sí | — (❓ ¿también exento en Proyecto?) |
| Habilitado (Sí/No) | Sí | — |
| Equipamiento agrícola | Solo se muestra en Agrícola | — |

- **Hacer:**
  - Migración: `totalTimeHours Int?` y `avDescription String?`.
  - Un único `lib/aircraft-rules.ts` con `isRequired(field, categoryId)` usado por la validación del cliente **y** del servidor (hoy el servidor no valida nada).
  - En el formulario, los labels dicen "(opcional)" según la categoría.
  - Donde se muestran las horas (cards, detalle, PDF `AircraftPDF.tsx`), mostrar "No informadas" si son `null`. Revisar el error de tipos en `app/api/aircraft/[id]/pdf/route.tsx` l.44.
  - Regla extra de la composición: **"Condición: si el año no es el actual, no se permite 'Nuevo'"**. Validarlo en el cliente y en el servidor.

### VA-45 · Esconder los filtros de Aviones y Repuestos con un menú desplegable
- **Visto en vivo (375 px):**
  - `/planes` (versión desplegada): la barra de filtros completa ocupa toda la pantalla y las cards quedan aplastadas en una columna angosta a la derecha. En el código local **ya está** el drawer, pero falta desplegarlo.
  - `/spareparts`: **está roto también en local.** `app/spareparts/page.tsx` l.165 usa `<section className="flex items-start gap-6">` (sin `flex-col` en mobile) y `SparePartFiltersSidebar.tsx` **no tiene drawer mobile**. La columna de resultados mide 84 px y la página se ensancha a 467 px (scroll horizontal).
- **Hacer:**
  1. `/spareparts`: replicar el patrón de `/planes`: botón "Filtros (n)" + "Ordenar" en mobile, drawer lateral, `flex-col lg:flex-row` y `aside` solo en `lg:`.
  2. Las dos barras: cada sección (Precio, Categoría, Marca, Modelo, Condición, Opciones) como **acordeón colapsable**, cerrado por defecto salvo las secciones con filtros activos, con un contador en el encabezado. En Marca, mostrar 6 y "Ver todas (N)".
  3. Filtros que pide la composición y **faltan**:
     - **Año desde-hasta**: en `app/planes/page.tsx` no existe filtro de año, aunque hay índice en `year`.
     - **"Publica": Particular / Intermediario / Fábrica**: mapea a `User.userType` (`PARTICULAR`/`RESELLER`/`FACTORY`); filtrar con `seller: { userType: { in: [...] } }`. Ojo: hoy el registro solo asigna `PARTICULAR` o `RESELLER`.
     - Pistón/Turbohélice como hijos de Monomotor y Bimotor (VA-43).
- **Aceptación:** a 375 px, `/planes` y `/spareparts` muestran las cards a ancho completo, los filtros se abren en un drawer y `document.documentElement.scrollWidth === 375`.

**Estado (9/10/2026):** ✅ hecho en local (commit `4b55359`). Estructura común en `components/ui/filters/FilterShell.tsx` (`FilterShell`, `FilterSection` con contador, `AppliedFilterChips`), usada por las dos barras. `/spareparts`: panel lateral en celular, "Filtros" + "Ordenar" lado a lado, orden con `SortDropdown` (antes no se podía ordenar), grilla de 3 columnas con la barra lateral. `/planes`: filtros nuevos **Año** (`minYear`/`maxYear`) y **Publica** (`sellerType` → `seller.userType`), Marca con 6 + "Ver todas (N)". Aplicar/limpiar conserva el orden. Verificado: a 375 px sin scroll horizontal y cards de 333 px; conteos iguales a la base (año 2020–2026: 11, intermediarios: 8, repuestos en pesos: 22); orden por precio ascendente correcto; aplicar categoría desde el panel conserva moneda y orden. Ojo: el registro todavía solo asigna `PARTICULAR`/`RESELLER`; "Fábrica" va a dar 0 hasta que haya cuentas de ese tipo.

### VA-46 · Círculo rojo si falta información del perfil
- **Archivos:** `components/ui/Header.tsx` (ya hay un puntito rojo para preguntas sin responder, l.75–77), `components/ui/ProfileView.tsx`.
- **Hacer:**
  - Helper `getProfileCompleteness(user)` en `lib/profile.ts` que devuelva los campos faltantes: `phone`, `email` (verificado), `city`, `province` y ❓ `image`.
  - En el Header, mostrar un punto rojo en el ícono de usuario si falta algo (combinarlo con el de preguntas en la misma query de VA-13).
  - En el perfil del dueño: un aviso "Completá tu perfil para que te puedan contactar" y punto rojo junto a cada campo vacío.
  - Bloquear la publicación sin teléfono ❓ DECISIÓN, porque sin teléfono no hay botón de WhatsApp.


**Estado (9/10/2026):** ✅ hecho en local (commit `e397ebd`). `lib/profile.ts` (`getMissingProfileFields`): teléfono, ciudad, provincia y email verificado — este último solo en cuentas con contraseña, porque las de Google no tienen `emailVerified` en la base pero el email ya está verificado por Google. Foto opcional. Punto rojo del header (cacheado 60 s, invalidado al guardar el perfil) + "Completá tu perfil" en el menú; en el perfil del dueño, cartel con lo que falta, punto en "Ajustes" y junto a cada campo vacío. **Publicar sin teléfono bloqueado (D7)**: tarjeta en `/publish` para cargarlo ahí mismo y validación en `createListing`. Editar no se bloquea. Probado con el usuario de prueba (teléfono y provincia borrados y restaurados): cartel, puntos, tarjeta, validación de teléfono corto y guardado.
### VA-47 · Aviso de publicaciones gratis y cartel de invitación
Del ítem que vino pegado en la lista: *"…una vez registrado, marcar con un aviso las publicaciones gratis"* + *"Cartel con invitación a registrarse comentando las publicaciones gratis iniciales"*.
- **Decisión de los socios:** la cantidad y las condiciones de las publicaciones gratis **se van a definir más adelante con un cupón**. No implementar saldos ni descuentos ahora.
- **Hacer solo la parte visual, con el texto en una constante** (`lib/promo.ts`, por ejemplo `LAUNCH_PROMO = { enabled: true, text: "Publicá gratis durante el lanzamiento" }`), para cambiarlo sin tocar componentes:
  1. Usuario no logueado: banner en la Home (después del hero) y en `/planes` y `/spareparts`, invitando a registrarse ("Promoción de lanzamiento: publicá tu avión 100% gratis", como propone la composición). Se puede cerrar y se recuerda en `localStorage` con try/catch. Nada de modales al entrar.
  2. Usuario logueado: aviso en `/publish` y en el perfil con el mismo texto.
  3. Con `enabled: false` desaparece todo.


**Estado (9/10/2026):** ✅ hecho en local (commit `b79db15`). Decisión del socio: **solo el avión** ("Promoción de lanzamiento: publicá tu avión 100% gratis"), **pocos lugares** y **arranca prendido**. Visitantes: cartel en la Home debajo del hero, visto como mucho 2 veces por navegador (`LAUNCH_PROMO.maxViews`) o hasta cerrarlo; no va en `/planes` ni `/spareparts`. Con cuenta: aviso en `/publish` al publicar un avión. Todo sale de `lib/promo.ts`. Probado: 1ª y 2ª visita lo muestran, la 3ª no; la X lo cierra para siempre; con sesión no aparece en la Home.
### VA-48 · Menú desplegable en "Repuestos" en la Home
- **Interpretación ❓:** en el header (desktop) y en el menú mobile, "Repuestos" abre un desplegable con las categorías raíz (las mismas del carrusel `SparePartCategoriesCarousel`) que lleva a `/spareparts?category=<id>`. Reusar `DropdownMenu` de `components/ui/dropdown-menu.tsx`. Las categorías salen de una consulta cacheada (VA-13).
- Si el socio se refería a otra cosa (por ejemplo, el filtro del hero `HomeFilter.tsx`), ajustar.
- **Relacionado (composición):** "En pleno ingreso poner el botón VER TODO AERONAVES y otro VER TODO REPUESTOS". Agregar dos botones debajo del buscador del hero (`components/ui/hero-banner.tsx`), visibles sin scrollear en mobile.


**Estado (9/10/2026):** ❌ **descartado por el socio** (9/10). Se implementó el desplegable de "Repuestos" en el header y los botones "Ver todo aeronaves / Ver todo repuestos" en el hero, pero el socio pidió sacarlos; no se commiteó nada.
### VA-55 · Título de la Home legible en un solo color (composición)
- `components/ui/hero-banner.tsx` l.62: "a bordo" usa un degradé `from-white via-red-100 to-[#E70F1F]` que **en vivo se lee mal** sobre el fondo. La composición pide "el título bien legible en un solo color, se puede hacer un difuminado a la imagen de atrás". Título en blanco sólido y un overlay con degradé oscuro detrás del bloque de texto (`bg-gradient-to-b from-black/40`).


**Estado (9/10/2026):** ✅ cerrado en local. Primero (`0705fd2`) se puso el título en blanco sólido con un difuminado oscuro detrás; **el socio pidió volver al degradé** (9/10): `6ea8f9f` deja "a bordo" en degradé blanco → rojo **sin** recuadro oscuro, con el rojo final más claro (#FF5A64 en vez de #E70F1F) y una sombra suave para que se lea sobre el azul.
### VA-56 · Fondo estándar con filtro blanco en todas las páginas (menos la Home)
**Pedido de los socios:** todas las páginas, menos la Home, tienen que tener una imagen de fondo con un filtro blanco suave, como `/terms` y `/privacy`.

**Lo que encontré:**
- **El patrón ya existe**, pero copiado a mano en unos 20 archivos, con variaciones: `<Image fill className="-z-20 object-cover" />` + `<div className="absolute inset-0 -z-10 bg-background/85" />`. Algunos usan `/80`; `/howtopublish` usa `bg-slate-50/90 backdrop-blur`; el perfil usa `fixed`.
- **Cuatro imágenes referenciadas no existen (404 en producción):** `/bkg-terms.jpg` (por eso `/terms` hoy se ve sin imagen, solo el color de fondo), `/bkg-report.jpg`, `/bkg-faq.jpg` (existe como **.png**) y `/bkg-ads.jpg` (existe como **.png**).
- **Páginas sin fondo:** `/spareparts`, `/search`, `/questions`, los dos detalles (avión y repuesto), el panel admin (usa `bkg-profile.jpg` en lugar de `bkg-admin.png`).
- **Imágenes de `public/` que no se usan:** `bkg-admin.png`, `bkg-aircraft.png`, `bkg-banner.png`, `bkg-planes.png`, `bkg-publish.png`, `bkg-qa.png`, `bkg-questions.jpg`, `bkg-spareparts.png`, `bkg-home.png` y `bkg-register.png`.

**Hacer:**
1. Crear `components/ui/PageBackground.tsx`:
   - Contenedor `fixed inset-0 -z-10 pointer-events-none`, para que la imagen quede fija en la pantalla y no se estire en páginas largas.
   - `<Image fill priority sizes="100vw" quality={60} className="object-cover" />`. Con 85 % de filtro no se nota la menor calidad.
   - Encima, `<div className="absolute inset-0 bg-background/85" />`.
   - Props `src` y opcionalmente `overlay` (por defecto 85).
2. Un mapa único de ruta → imagen en `lib/page-backgrounds.ts`. Si no hay una imagen específica, usar el fallback. Asignación propuesta, usando los nombres de `public/`:

| Ruta | Imagen | Nota |
|---|---|---|
| `/planes` | `bkg-planes.png` | Hoy `bkg-forms.png` |
| `/planes/plane-details/[id]` | `bkg-aircraft.png` | Hoy sin fondo |
| `/spareparts` y su detalle | `bkg-spareparts.png` | Hoy sin fondo |
| `/publish` | `bkg-publish.png` | Hoy `bkg-forms.png` (en `PublishForm.tsx`) |
| `/howtopublish` | `bkg-publish2.png` | Unificar el filtro (hoy `slate-50/90` + blur) |
| `/questions` | `bkg-questions.jpg` | Hoy sin fondo |
| `/faq` | `bkg-faq.png` | Hoy apunta a `.jpg` (404) |
| `/services/guides` y `/services/guides/[slug]` | `bkg-faq.png` (`backgrounds/faq.webp`) | Agregadas en VA-78 (9/10; antes en `/guias`), clave `guides` en `lib/page-backgrounds.ts` |
| `/ads` | `bkg-ads.png` | Hoy apunta a `.jpg` (404) |
| `/banners` | `bkg-banner.png` | Hoy `bkg-ads.jpg` (404) |
| `/terms` | `bkg-privacidad.jpg` | No hay una específica; hoy `bkg-terms.jpg` (404) |
| `/privacy` | `bkg-privacidad.jpg` | Igual que hoy |
| `/report` | `bkg-qa.png` | No hay una específica; hoy `bkg-report.jpg` (404) |
| `/login` | `bkg-login.jpg` | Igual que hoy |
| `/register` | `bkg-register.jpg` | Igual que hoy |
| `/profile/[id]` | `bkg-profile.jpg` | Hoy hay **dos fondos superpuestos** (`page.tsx` con `bkg-forms.png` y `profile-client.tsx` con `bkg-profile.jpg`). Dejar uno |
| `/favs`, `/search`, `/services` | `bkg-forms.png` | Fallback genérico |
| `/plans`, 404, 403, 500, mantenimiento, sin conexión | `bkg-plans.jpg` | Unificar el filtro de 80 a 85 |
| `/admin/*` | `bkg-admin.png` | Hoy `bkg-profile.jpg` |
| **`/` (Home)** | — | **Sin fondo estándar**: mantiene el hero |

3. Reemplazar en cada página el bloque copiado por `<PageBackground src={...} />` y quitar los hacks de margen (`-mb-16` en `/terms`, etc.) si dejan de hacer falta.
4. Las cards y paneles encima del fondo usan `bg-white/80`–`/90`. Unificar en `bg-white/90` + `backdrop-blur-sm` para que el texto siempre se lea bien.
5. Optimización (relacionada con VA-62): estas imágenes pesan 2–3 MB. Convertirlas a WebP (de 200 a 400 KB, 1920 px) y actualizar el mapa.
6. `--background` cambia a casi negro dentro de `.dark` (`globals.css` l.69). Hoy no se activa, pero si alguien agrega modo oscuro el filtro pasaría a ser negro. Usar `bg-white/85` explícito o dejar el modo claro forzado.

- **Aceptación:** recorrer todas las rutas de la tabla a 375 px y a 1280 px. Todas muestran la imagen con el filtro blanco uniforme, ninguna imagen da 404 (revisar la pestaña Network) y la Home no cambia.

**Estado (9/10/2026):** ✅ hecho en local (commit `e6ddf5b`). `components/ui/PageBackground.tsx` + mapa `lib/page-backgrounds.ts` con la tabla de arriba; 21 archivos dejan el bloque copiado y se suman fondos a `/spareparts`, `/search`, `/questions`, los dos detalles y el aviso de publicación inactiva. Los 4 fondos que daban 404 quedan arreglados. Filtro con color explícito (`hsl(210 60% 97% / 0.85)`), no `bg-background`, así no cambia con `.dark` (punto 6). Fuera los `-mb-16` (el footer es opaco; `pb-36` → `pb-20`). Punto 5: fondos en WebP de 1920 px en `public/backgrounds/` (27,8 MB → 2,0 MB) con `scripts/optimize-backgrounds.mjs`; se sirven con `unoptimized` porque Next 16 solo acepta `quality` 75 por defecto (con 60 el optimizador daba 400) y así no consumen cupo de Vercel. Verificado: las 26 rutas cargan su fondo sin imágenes rotas; capturas a 375 y 1280 px. **No se hizo** el punto 4 (unificar todas las cards en `bg-white/90`): el texto se lee bien en todas las pantallas revisadas. Los PNG/JPG originales siguen en `public/` (borrarlos es parte de VA-62).

### VA-57 · Rediseño de la sección de detalles de avión y repuesto (maqueta del socio)
**Estado (8/10/2026):** ✅ hecho en local (commits `553d45a` y `8b614da`). Verificado con 5 avisos de prueba en `va_dev` a 375 y 1280 px; tabla campo → detalle en `docs/REGISTRO_DE_CAMBIOS.md` (0 faltantes). Pendiente: revisar visualmente los PDF (responden 200) y el orden mobile de VA-41.
**Maqueta:** `docs/mockups/detalle-1-caracteristicas.jpeg`, `detalle-2-general-motor.jpeg`, `detalle-3-helice-avionica-equipamiento.jpeg` y `detalle-4-exterior-interior.jpeg`. Abrilas antes de empezar. **Se respeta el estilo de UI actual** (colores, tipografías, bordes, `DetailRow`, cards); lo que cambia es la estructura.

**1. Línea de fecha + ubicación.** La ubicación del aviso (`ciudad, provincia`) va **en la misma línea que "Publicado el …"**, por ejemplo `Publicado el 25/9/2026 · 📍 Armstrong, Santa Fe`, con un ícono de ubicación (`lucide-react`). En celular, si no entra, que pase a una segunda línea sin romperse.

**2. Bloque "Características de la aeronave" con íconos** (maqueta 1). Una card con título y chevron para plegar/desplegar (abierta por defecto). Grilla de **2 columnas en desktop y 1 en celular**. Cada ítem: ícono en un círculo gris claro + label + valor en negrita. Ítems, **solo si tienen valor o están en Sí**:
   - Acepta permuta: Sí (`trade`)
   - Financiación: Sí (`financing`)
   - Precio negociable: Sí (**campo nuevo**, ver VA-54)
   - Posible alquiler (`rent`)
   - Cant. pasajeros: N (`passengers`)
   - Habilitado hasta: dd/mm/aaaa (`certified` + `certDate`; si está habilitado sin fecha, "Habilitado: Sí")
   - Apto IFR (`avAaptoifr`)
   - Autopilot (`avAutopilot`)
   - Aire acondicionado (`airconditioner`)
   - Sist. oxígeno en cabina (`oxygen`)

   Íconos de `lucide-react` coherentes con la maqueta (por ejemplo `Handshake`, `DollarSign`, `CalendarCheck`, `Users`, `Wind`, `Navigation`). Este bloque **reemplaza** a los badges actuales de "Atributos destacados" y "Opciones de negociación", para que no se repitan.

**3. "Información adicional": tablas una debajo de la otra** (maquetas 2, 3 y 4), en una sola columna, con el estilo label/valor actual de `DetailRow`. Hoy son dos columnas (`grid md:grid-cols-2`): pasan a una sola. Orden y contenido:
   1. **General:** Marca, Modelo, Variante, Año, Horas totales, Categoría, Estado (con label legible, no `USADO` en crudo, ver VA-23).
   2. **Motor:** Marca, Modelo, Potencia (HP), Horas totales, TBO, DURG / SMOH, Descripción.
   3. **Hélice:** Marca, Modelo, Horas totales, Descripción.
   4. **Aviónica / Equipamiento / Radio:** Descripción.
   5. **Equipamiento adicional:** Descripción. Si el texto tiene varias líneas, mostrarlas como lista con viñetas (cada salto de línea = un ítem), como en la maqueta.
   6. **Implementos agrícolas:** Descripción, **solo en categoría Agrícola** (`A`).
   7. **Exterior:** Descripción.
   8. **Interior:** Cant. pasajeros, Descripción.

   **Numeración de motores y hélices:** si la aeronave tiene **más de un motor** (Bimotor, `BP`/`BT`), las tablas se titulan **"Motor 1", "Motor 2", "Hélice 1", "Hélice 2"**. Si tiene uno solo, **"Motor"** y **"Hélice"**, sin número.

   Una fila o tabla **sin valor no se muestra** (nada de "N/N" ni filas vacías). Si una tabla queda sin filas, se oculta el título también.

**4. Ningún dato completado puede quedar sin mostrarse.** Antes de dar la tarea por terminada, armá una tabla en el PR/resumen con **cada campo del formulario de publicación** (`PublishForm.tsx` y `lib/listing-schema.ts`) → dónde aparece en el detalle (o "no se muestra a propósito", con el motivo). Revisá especialmente: documentos adjuntos, `certDate`, `plate` (matrícula: ❓ D13, si no hay decisión, no mostrarla y anotarlo), `extDescription`, `intDescription`, datos de cada motor y hélice, `customBrand`/`customModel`, subcategoría/variante. Creá un aviso de prueba con **todos** los campos completos y otro con **solo** los obligatorios, y verificá los dos.

**5. Repuestos (mismo criterio).** En el detalle de repuesto: fecha + ubicación en la misma línea; bloque de características con íconos (Estado, Stock, Moneda/precio a consultar, Nº de parte); tablas una debajo de la otra (General: Marca, Nº de parte, Categoría › Subcategoría, Estado, Stock; Compatibilidad: aeronaves compatibles; Atributos: los `attributes`/filtros cargados). Misma regla de "no mostrar vacíos" y "ningún dato completado sin mostrar".

**6. Coordinación con otras tareas:** VA-41 (orden en celular: fotos → título + precio → contacto → características → información adicional → descripción → documentos → preguntas), VA-23 (labels de enums), VA-24 (no mostrar "0"), VA-54 (campos nuevos). La ficha PDF (`AircraftPDF.tsx`, `SparePartPDF.tsx`) puede seguir igual, pero tiene que incluir los campos nuevos.

- **Aceptación:**
  - A 375 px y a 1280 px se ve como la maqueta, con el estilo actual del sitio.
  - Un Bimotor muestra "Motor 1/Motor 2" y "Hélice 1/Hélice 2"; un Monomotor, "Motor" y "Hélice".
  - "Implementos agrícolas" solo aparece en Agrícola.
  - Los dos avisos de prueba (completo y mínimo) se ven bien y la tabla campo → detalle no tiene huecos.

### VA-49 · Invertir colores de los íconos de "Cómo funciona"
- **Archivo:** `components/ui/HowItWorks.tsx` l.32–33.
- **Hacer:** círculo `bg-primary` (rojo `#E70F1F`) con ícono `text-white`. Hover: `bg-red-700`. Quitar el borde translúcido.


**Estado (9/10/2026):** ✅ hecho en local (commit `ea41c8b`). Círculo `bg-primary` (rojo de marca) con ícono blanco, hover `bg-red-700`, sin borde.
### VA-50 · Tamaño del logo del footer
- **Archivo:** `components/ui/Footer.tsx` l.19. Hoy es `w-80 sm:w-[384px] md:w-[448px] h-24`, que en la grilla de 4 columnas desborda la columna. Bajar a algo como `w-48 sm:w-56 h-14` (ajustar a ojo con el socio) y probar a 375 px.
- De paso: el teléfono `+54 9 000 000 0000` (l.104) es un placeholder. ❓ Poner el real o quitar la línea.


**Estado (9/10/2026):** ✅ hecho en local (commit `7685be7`). Logo con ancho fluido y su proporción real (1842×128, máx. 288 px): entra en la columna a 375 y 1280 px. Teléfono real **+54 9 3456 44-5758** (D10) en `CONTACT_PHONE` de `lib/site.ts`, usado en el footer y en el JSON-LD de la organización.
### VA-51 · Imagen del footer
- `Footer.tsx` ya usa `public/bkg-footer.png` (fondo azul con las barras "//", el archivo más reciente, de 78 KB) y en vivo se ve bien. **Parece resuelto.** ❓ Confirmar con el socio que es la imagen del Drive; si lo es, cerrar la tarea.

### VA-52 · Cambiar las imágenes de Aviones y Repuestos en la Home
- `components/ui/HomeServiceCards.tsx` usa `card-plane.png` (agrícola fumigando, 2,4 MB) y `card-sparepart.png` (hélice y cajas, 2,3 MB).
- Candidatas en `public/`: `bkg-aircraft.png` (agrícola al atardecer) y `bkg-spareparts.png` (depósito de repuestos). VA-56 también las usa como fondo de `/planes/...` y `/spareparts`, lo cual no es un problema. ❓ Confirmar con el socio cuáles quiere en las cards antes de cambiarlas; si no responde, dejar las actuales.
- Convertirlas a WebP de menos de 300 KB y pasar `sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"`.


**Estado (9/10/2026):** ✅ hecho en local (commit `de436d2`). Decisión del socio: **opción B**. Aviones = agrícola al atardecer (`bkg-aircraft.png`, el fondo del detalle de avión) y Repuestos = depósito (`bkg-spareparts.png`, el fondo de `/spareparts`). Servicios sigue con su imagen. Las tres pasan a `public/cards/*.webp` de 960 px (48–73 KB, antes ~2,4 MB) con `scripts/optimize-cards.mjs`, y llevan `sizes`. El encuadre de Aviones se corrió (`object-[70%_65%]`) para que se vea el avión. Probado a 375 y 1280 px. `card-plane.png` y `card-sparepart.png` quedan sin uso (para VA-61/VA-62).
### VA-53 · Actualizar el formato de la descripción en las publicaciones
- ❓ **Falta definir qué formato quiere el socio.** Opciones:
  - **(a)** Mantener texto libre pero con mejor tipografía (títulos, listas con "-", máximo de 2000 caracteres y contador).
  - **(b)** Dividir en secciones fijas opcionales: "Historial", "Mantenimiento reciente", "Estado general", "Motivo de venta".
  - **(c)** Plantilla precargada en el textarea.
- Mientras tanto: en el detalle, mostrar la descripción colapsada a 6 líneas con "Ver más" en mobile.
- La composición agrega dos pistas: "descripción breve" visible arriba (horas totales, overhaul, etc.) y el campo `Descripción*` como **último paso** del formulario (Paso 4). Propuesta: un resumen automático arriba (año · horas · motor · ubicación) y la descripción libre abajo, sin pedirle al vendedor que repita datos.


**Estado (9/10/2026):** ✅ hecho en local (commit `c56fac3`). Decisión del socio: **opción (a)**, texto libre, más "Ver más". `components/ui/listing/ListingDescription.tsx`: una línea corta que termina en ":" se muestra como subtítulo, las que empiezan con "-", "•" o "*" forman una lista, y una línea en blanco separa párrafos. En celular arranca en 6 líneas con "Ver más" / "Ver menos", que solo aparece si el texto no entra; desde `lg` se ve completa. Formulario: `components/ui/DescriptionTextarea.tsx` con tope de **2000 caracteres** (`MAX_DESCRIPTION_LENGTH` en `lib/listing-schema.ts`, antes 5000; la más larga en `va_dev` tiene 365), contador, ayuda de formato y ejemplo. La impresión usa el mismo formato. **Pedido extra del socio (9/10):** el recuadro "Motor" junto a las fotos muestra como mucho **4 datos** (los primeros cargados entre marca, modelo, horas motor, DURG/SMOH, potencia y TBO). **Corrección del socio (9/10): son 3 fijos, en este orden: Marca, Modelo y TBO** (TBO "No informado" si falta). La ficha de abajo vuelve a mostrar el motor completo. Se quitó "Tipo" del recuadro porque ya lo dice la categoría. El resumen automático arriba de la descripción no se hizo: los datos clave ya están en el recuadro del costado. Probado a 375 y 1280 px con una descripción de prueba (después restaurada). El campo del formulario (último paso) no se vio en pantalla; compila y se usa igual que antes.
### VA-54 · Sumar campos a "Publicación avión" (según la composición)
**Estado (8/10/2026):** ✅ hecho en local (commit `1460fb8`). Migración `20261008194327_va54_campos_nuevos` aplicada en `va_dev` (`Aircraft.negotiable/extraEquipment/agEquipment`, `AircraftEngine.horsepower`, `AircraftPropeller.brand`). En formulario (alta y edición), esquema Zod, servidor y `AircraftPDF`. Además: label "DURG / SMOH", input "Horas del motor" (existía en la base sin input), guía de fotos y label "Habilitado hasta (vencimiento del anual)". Las hélices anteriores siguen con la marca dentro de `model` (no se separó automáticamente). Pendientes: label de `RECORRIDO` (❓) y matrícula pública (D13).
Comparación del formulario de la composición (anexo A, "AVIONES") contra el schema actual:

| Paso | Campo en la composición | Hoy | Acción |
|---|---|---|---|
| 1 | Título*, Año*, Precio (monto/a consultar)*, Marca*, Modelo/Submodelo*, Categoría* | Existe | Validar en el servidor |
| 1 | Condición (no "Nuevo" si el año no es el actual) | Existe sin la regla | Ver VA-44 |
| 1 | Horas totales* (con excepciones) | Obligatorio siempre | VA-44 |
| 1 | Financiación / Permuta / Alquila | Existe | — |
| 2 | Motor: TBO*, DURG, Marca, Modelo, Descripción | Existe | — |
| 2 | **Motor: Potencia** | **No existe** | Agregar `AircraftEngine.horsepower Int?` |
| 2 | Hélice: Horas, Descripción | Existe | — |
| 2 | **Hélice: Marca** | No existe (hay `model`) | Agregar `AircraftPropeller.brand String?` y mantener `model` |
| 2 | **Equipamiento adicional: descripción** | **No existe** | Agregar `Aircraft.extraEquipment String?` |
| 2 | **Implementos agrícolas: descripción (solo Agrícola)** | **No existe** | Agregar `Aircraft.agEquipment String?`. En el formulario el campo se llama **"Implementos agrícolas"** y **solo aparece si la categoría es Agrícola (`A`)**; si se cambia de categoría, se limpia. En el detalle, ver VA-57 |
| 1 | **Precio negociable (Sí/No)** | **No existe** | Agregar `Aircraft.negotiable Boolean @default(false)` junto a Financiación/Permuta/Alquila (pedido en la maqueta del socio, VA-57) |
| 2 | Aviónica: Descripción* (exenta A y PR), Apto IFR, Autopilot | Existe (obligatoria siempre) | VA-44 |
| 3 | Imágenes* + guía de fotos (portada ¾ frente, ¾ trasero, laterales, tablero, tapizado, motor, detalle) | Imágenes sí, guía no | Mostrar la guía como "viñetas de ayuda" en el paso de fotos |
| 3 | Documentación (PDF opcional), Fecha habilitación anual, **Habilitado (Sí/No)***, Matrícula | `certified`, `certDate`, `plate` | `certDate` no debe guardar "hoy" por defecto (VA-22). Matrícula opcional y **no** mostrarla públicamente salvo que el vendedor lo elija ❓ |
| 4 | Ubicación, Interior (desc., pasajeros, aire acond., oxígeno), Exterior (desc.), Descripción* | Existe | Descripción como último paso |

- La composición prioriza: "la aviónica es más relevante que el sistema de aplicación"; capacidad de tolva y ancho de barra son "info extra" (texto libre dentro de equipamiento agrícola, sin columnas propias); SMOH y TBO son "datos importantes" pero no más que las horas totales. **Confirmado: DURG = SMOH.** No agregar un campo nuevo. Cambiar el label en el formulario, el detalle y el PDF a **"DURG / SMOH (hs desde última revisión general)"**.
- Todos los campos nuevos son opcionales. Mostrar en el detalle solo los que tienen valor.
- Repuestos (composición, "REPUESTOS"): Estado "Nuevo / Usado / Overholeado / A reparar" mapea a `NUEVO`/`USADO`/`RECORRIDO`/`REPARAR`. Unificar el label de `RECORRIDO` (hoy "Recorrido") con lo que use el socio ❓. "Subcategoría*" tiene que ser obligatoria cuando la categoría tiene hijas (verificar en `PublishForm`).

### VA-58 · Miembros fundadores asignados a mano desde el admin (pedido del socio, 8/10)
- **Hoy:** `register-action.ts` marca `isFoundingMember` si hay menos de 50 usuarios en la base, así que las cuentas de prueba ocupan lugares y quien entra con Google nunca lo recibe.
- **Hacer:**
  - Sacar la asignación automática del registro.
  - Nueva sección **Usuarios** en el panel admin (`/admin/users`): lista con búsqueda por nombre o email, fecha de alta, si verificó el email, cantidad de publicaciones e insignia de fundador. Un botón activa o quita "Miembro fundador".
  - Contador "Fundadores: X de 50" y no permitir pasar de 50 (`FOUNDING_MEMBER_LIMIT` en `lib/`).
  - Server actions con control de admin, igual que VA-02.
- **Datos existentes:** las insignias ya asignadas en producción no se tocan; el admin las puede quitar desde la nueva pantalla.

**Estado (8/10/2026):** ✅ hecho en local (commit `0d59127`). `/admin/users` (enlace "Usuarios" en el menú del admin), `app/actions/admin-users-actions.ts`, `components/ui/FoundingMemberToggle.tsx`, `FOUNDING_MEMBER_LIMIT` en `lib/constants.ts`. Probado en `va_dev`: dar y quitar la insignia actualiza el contador (6 → 7 → 6), la búsqueda y el filtro "Solo fundadores" funcionan. El tope de 50 no se probó en vivo (hay 16 usuarios). En `va_dev` (copia de producción) hay 6 fundadores asignados automáticamente, entre ellos cuentas de prueba (`augusto@gmail.com`, `delivered@resend.dev`): revisarlos desde la pantalla nueva en producción. El panel admin no está adaptado a 375 px (barra lateral fija de 256 px); es de todo el admin, no de esta pantalla.


### VA-59 · Precio de publicar un avión y un repuesto (por unidad) editable desde el admin (pedido del socio, 9/10)
- **Alcance:** solo el **precio por menor** de publicar **un** avión y **un** repuesto. Los planes de suscripción son otra cosa y van en VA-80.
- **Hoy:** no hay un precio por publicación guardado en ningún lado (publicar es gratis). Los packs de `app/plans/page.tsx` y los banners de `app/banners/page.tsx` (`PLAN_PRICES`) tienen precios escritos en el código.
- **Hacer:**
  - Guardar los dos precios en la base (por ejemplo, una tabla `ListingPrice` con `AIRCRAFT` / `SPARE_PART`, monto y moneda) con valores iniciales.
  - Nueva sección **Precios** en el panel admin (`/admin/prices`) con los dos precios. Editar abre un **diálogo de confirmación** con precio anterior → nuevo y la variación en %; para cambios grandes (más del 50 % o a 0) pedir escribir "CONFIRMAR".
  - Validar en el servidor: solo admin (como VA-02), número positivo con tope razonable.
  - Historial de cambios (`ListingPriceChange`: tipo, precio anterior, nuevo, admin, fecha).
  - El precio que se cobra se toma **siempre del servidor** (nunca del cliente): un cambio aplica a las compras nuevas, no a las que ya están en curso.
  - Mostrar el precio vigente donde corresponda (`/publish`, `/howtopublish`) leyendo de la base.
- **Relación:** el cobro en sí es de la Fase 6 (Mercado Pago). Mientras publicar sea gratis (cupón de lanzamiento, VA-47), el precio solo se muestra.
- **Migración:** tablas nuevas (mostrar el SQL antes de aplicar, regla de la sección 0).

**Estado (10/10/2026):** ✅ hecho en local (commit `ffdc71e`). Migración `20261010180000_va59_precios_de_publicacion` aplicada en `va_dev` con OK del socio: enum `ListingKind`, `ListingPrice` (una fila por tipo; iniciales **AR$ 30.000** avión y **AR$ 15.000** repuesto, los "Plan 1" que ya estaban en `/plans`) y `ListingPriceChange` (anterior, nuevo, admin, fecha; si se borra el admin queda el registro). **Admin:** `/admin/prices` ("Precios" en el menú) con los dos precios e historial; "Cambiar precio" abre un `<dialog>` nativo con antes → después y variación; los cambios de más del 50 %, a 0 o desde 0 piden escribir CONFIRMAR (se pasa a mayúsculas al tipear). `updateListingPriceAction` valida en el servidor: solo admin, entero entre 0 y 10.000.000, misma regla de CONFIRMAR, y guarda precio + historial en una transacción. **Dónde se muestra:** `lib/listing-prices.ts` (`unstable_cache` con tag `listing-prices`, invalidado por la action): `/plans` ("Plan 1 Avión" y "Plan 1 Repuesto"; la página pasa a servidor y la parte interactiva a `PlansClient.tsx`), `/howtopublish` (paso 3) y `/publish` (tachado en el aviso de la promo de lanzamiento; en repuestos, "por ahora no se cobra; el pago se habilita más adelante"). `/plans` y `/howtopublish` siguen estáticas. El cobro sigue siendo de la Fase 6. **Verificado** en el build de producción: +10 % se guarda y queda en el historial; a 0 bloquea Guardar hasta escribir CONFIRMAR; después del cambio `/plans`, `/howtopublish` y `/publish` muestran el precio nuevo; 375 px sin scroll horizontal. Precios e historial de la prueba volvieron a los iniciales. **En producción:** `npm run migrate:deploy` (lo corre el socio).

---

## FASE 5 — Responsive y limpieza

### VA-60 · Pantallas sin adaptación a mobile
Prioridad según el escaneo de clases responsive (0 = ninguna):
1. **Panel admin** (`app/admin/layout.tsx`): barra lateral fija `w-64` siempre visible → en mobile se come la mitad de la pantalla. Convertirla en drawer con botón hamburguesa debajo de `lg`. Todas las tablas (`admin/page.tsx`, `listings`, `searches`, `traffic`, `coupons`, `AdminReportsTable.tsx`) necesitan un contenedor `overflow-x-auto` o una vista de cards en mobile.
2. `app/questions/QuestionsClient.tsx` (0 clases responsive): pestañas y tarjetas de pregunta/respuesta. Revisar.
3. `components/ui/ProfileView.tsx` (48 KB) y `app/profile/[id]/profile-client.tsx`: tabs, listados con acciones (renovar/editar/borrar) y modal de edición.
4. `components/ui/PublishForm.tsx` (94 KB): el stepper (`Stepper.tsx`) en mobile, los inputs en grilla y los botones fijos abajo.
5. Detalles (VA-41), Home, `/favs`, `/search`, `/spareparts`, `/plans`, `/ads`, `/banners`, `/howtopublish`, `/faq`, `/terms`, `/privacy`.
6. Grillas `grid-cols-4` sin breakpoint en `AircraftCard.tsx` l.307, `SparePartCard.tsx` l.293 y `PlaneActionsHeader.tsx` l.186: revisar a 375 px.

**Criterio general:** a 375 px, sin scroll horizontal, áreas táctiles de al menos 44 px, textos de al menos 14 px y nada tapado por el header.

**Estado (9/10/2026):** ✅ hecho en local (commit `533d31f`). Escaneo automático de 30 rutas a 375 px (scroll horizontal, elementos cortados, áreas táctiles) + capturas:
1. **Admin:** `components/admin/AdminNav.tsx`: debajo de `lg`, barra superior con botón de menú y panel lateral (se cierra al navegar); en escritorio, la misma barra lateral, ahora con la sección activa marcada. Todas las tablas ya tenían `overflow-x-auto`; las pestañas de `AdminReportsTable` bajan de línea.
2. **`/questions`:** se veía bien; solo las pestañas con textos cortos en celular ("Recibidas" / "Realizadas").
3. **Perfil:** pestañas en grilla 2×2 en celular (con scroll horizontal oculto, "Ajustes" no se veía); Renovar/editar/eliminar con 44 px. `profile-client.tsx` no se usa (VA-61).
4. **Publicar:** se veía bien; botones Volver/Siguiente a 44 px y círculos del stepper más grandes en celular.
5. **Detalle:** favoritos, compartir e imprimir eran `div` con `onClick` (sin teclado, área de 24 px): ahora botones con `aria-label` y 44 px; "Reportar" también. Footer con links más altos.
6. Las grillas `grid-cols-4` son los modales de compartir: entran bien a 375 px.
- **Pendiente:** `/spareparts` todavía se ensancha a 457 px — es VA-45 (drawer de filtros). Las flechas del carrusel de las cards miden 28 px pero solo aparecen con mouse; en celular se desliza. El criterio de "textos de al menos 14 px" no se aplicó a todo el sitio (hay mucho `text-xs` de diseño); se ajustó en los controles tocados.

### VA-61 · Código muerto y archivos que no van
Borrar (verificar con `grep` antes):
- `components/ui/AircraftGallery.tsx`, `HeroCarousel.tsx`, `ScrollVideoHero.tsx`, `PromoBanner.tsx`, `animated-search.tsx`, `PriceTicker.tsx` y `PriceTickerClient.tsx`: sin imports.
- `components/ui/Stepper.jsx` + `Stepper.css`: duplicado del `.tsx`, con error de parseo en ESLint.
- `lib/aircraft-service.ts`: todo comentado.
- `app/actions/listing-actions.ts` → `createAircraft`, `createSparePart` y `getListingDetails`: no se usan (el alta real está en `app/publish/actions.ts`).
- `debug-db.ts` y `PG local.session.sql`: este último es un ejercicio de SQL de otra materia (tablas `persona`, `medico`...) y no pertenece al proyecto.
- `public/hero-video.mp4` (8 MB, sin uso), `next.svg`, `vercel.svg`, `file.svg`, `globe.svg` y `window.svg`.
- `.vscode/settings.json` tiene usuario y contraseña de Postgres local: sacarlo del repo y agregar `.vscode/` a `.gitignore`.
- `next.config.ts`: quitar `picsum.photos`, `loremflickr.com` y `placehold.co` si ya no se usan datos de prueba. `allowedDevOrigins` con `*.loca.lt` solo para desarrollo.
- `package.json`: quitar `certbot`, `nodemailer` (se usa Resend), `@supabase/ssr`, `motion` y `@faker-js/faker` (ninguno se importa). `shadcn` es una CLI: pasarlo a `devDependencies` o quitarlo.


**Estado (9/10/2026):** ✅ hecho en local (commit `9b28362`). Verificado con `grep` antes de borrar. **Borrados:** `HeroCarousel`, `ScrollVideoHero`, `PromoBanner`, `animated-search`, `PriceTicker` y `PriceTickerClient`, `Stepper.jsx` + `Stepper.css` (`PublishForm` usa `Stepper.tsx`), `TrustBlock` (sin uso desde la limpieza de imports), `app/profile/[id]/profile-client.tsx` (no se importaba; tenía otro input de provincia), `lib/aircraft-service.ts`, `debug-db.ts`, y en `public/`: `hero-video.mp4` (8 MB), los 5 SVG de plantilla y `card-plane.png` / `card-sparepart.png` (reemplazadas en VA-52). **Dependencias quitadas:** `certbot`, `nodemailer` (+ `@types/nodemailer`), `@supabase/ssr`, `motion` y `@faker-js/faker`. **`.vscode/settings.json`** sale del repo (sigue en disco) y `.vscode/` va al `.gitignore`; ojo: la contraseña de Postgres local queda en el historial de git, conviene cambiarla si se usa en otro lado. **`next.config.ts`:** fuera `picsum.photos` y `placehold.co`; `allowedDevOrigins` pasa al nivel correcto (dentro de `serverActions` no hacía nada) y solo con `*.loca.lt`. **No se tocó:** `loremflickr.com` (hay 150 fotos de avisos de prueba en la base; sacarlo rompería esas imágenes hasta VA-27), `shadcn` (lo importa `app/globals.css`), `card-service.png` y los `bkg-*.png` (son la fuente de `scripts/optimize-*.mjs`). `AircraftGallery` y las funciones viejas de `listing-actions.ts` ya no existían. Build OK; `/`, `/publish` (stepper), `/spareparts`, detalles y perfil cargan bien. Lint: 65 errores y 6 warnings (antes 68 y 34; sin el error de parseo).
### VA-62 · Imágenes pesadas
Los fondos en `public/` pesan 2–3 MB cada uno (más de 40 MB en total). `next/image` los optimiza al servirlos, pero el primer render y el build se resienten. Convertirlos a WebP/AVIF y dejar en `<Image>` el `sizes` adecuado. Prioridad: los de la Home (`bkg-home2.png`, `bkg-home-mobile.png`).


**Estado (9/10/2026):** ✅ hecho en local (commit `eca2c4b`). **`public/` pasa de 48 MB a 3 MB.** Hero de la Home (`backgrounds/home2.webp` 63 KB y `home-mobile.webp` 104 KB) y fondo de "Vender" (`backgrounds/cta.webp` 108 KB) en WebP; antes eran PNG de 2,3–2,5 MB. Los originales se movieron a **`assets/originals/`** (fuera de `public/`, no se publican con el sitio; los usan `scripts/optimize-backgrounds.mjs` y `scripts/optimize-cards.mjs`). Borrados por no usarse: `bkg-home.png`, `bkg-register.png` (había `.jpg`), y los duplicados `bkg-publish2.png` / `bkg-qa.png`. `SellerCta` ya no usa `priority` (estaba lejos del primer pantallazo y competía con el hero) y tiene `sizes`. Probado a 1280 y 375 px: cada dispositivo baja su hero WebP. Los logos `logo-mark-*.png` (6, ~110 KB en total) no se usan pero se dejaron por ser el kit de marca.
### VA-63 · Lint
Hay 103 errores y 50 warnings. Después de las fases anteriores, corregir:
- `react-hooks/set-state-in-effect` (8 casos, por ejemplo `HeaderSearchBar.tsx` l.24/33 y `PublishForm.tsx` l.207/237). Son renders en cascada reales.
- `react-hooks/exhaustive-deps` en `PublishForm.tsx` l.243 (puede dejar modelos desincronizados al cambiar de marca).
- Los `any` en los archivos que se toquen.
- Los `no-unescaped-entities` (trivial).


**Estado (10/10/2026):** ✅ **hecho** en local (commits `cfc7d0b`, `2d81685` y `691c5cd`). **Lint en cero: 0 errores y 0 warnings** (eran 103 + 50 al armar el plan). Cierre del 10/10: (1) **renders en cascada** (los 9 `set-state-in-effect`): los buscadores del header guardan los resultados junto con la búsqueda que los trajo y derivan "cargando"/"abierto"/tipo por sección en el render; `AdminNav` cierra el panel al navegar ajustando el estado en el render; resumen y cupones del admin cargan con `.then()` dentro del efecto (y el resumen descarta la respuesta de un período anterior si llega tarde); `PublishForm` fija la marca inicial y "Usado" para años anteriores en el estado inicial y en el cambio de año (también resuelve el `exhaustive-deps`); Destacadas elige al azar solo en el navegador con `useSyncExternalStore`. (2) Comillas tipográficas en los textos. (3) `next/image` en el logo de taxonomía; la vista de impresión del detalle y los PDF de `@react-pdf/renderer` (su `<Image>` no tiene `alt`) quedan con excepciones comentadas. **Verificado** en el build de producción con Edge: buscador de escritorio y celular (cargando → resultados, se cierra con 1 letra, en `/spareparts` arranca en Repuestos), Destacadas con 2 tarjetas y sin avisos de hidratación, `/publish` (marca inicial elegida; año 2005 fuerza "Usado" y lo bloquea), `/admin` (carga y cambio a "Todo el histórico") y `/admin/coupons`.

Antes (9/10): de 68 errores + 34 warnings a 19 + 6. Hecho: (1) 28 imports/variables sin uso; (2) **los 48 `any`**: `catch` como `unknown` con `errorMessage()` (`lib/errors.ts`), estados del admin tipados con lo que devuelve cada action, `ProfileView` y `QuestionsClient` con tipos explícitos, PDF y perfil con `Record` tipados, seeds tipados. Bugs que salieron al tiparlo: `/planes?condition=X` y `/spareparts?condition=X` daban **error 500** (ahora se ignoran valores que no son del enum); `getLiveEvents` pasaba cualquier texto a Prisma como tipo de evento; `/questions` rompía si una pregunta no tenía avión ni repuesto; en `/admin/listings` los Top 5 perdían el tipo de `views`/`contacts`. **Falta:** 10 `no-unescaped-entities` (comillas en textos) y 9 `react-hooks/set-state-in-effect` (renders de más), más 2 imágenes sin `alt` en los PDF y 3 `<img>` (vista de impresión y taxonomía).
---

## FASE 5b — Rendimiento y tiempos de carga

Medido en `ventasaeronauticas.com` (8/10/2026, celular emulado):

| Página | JS que descarga el navegador (descomprimido) | HTML | TTFB | Cache |
|---|---|---|---|---|
| `/` (Home) | **26.335 KB (≈ 6,5 MB comprimido)** | 182 KB | 350–520 ms | `no-store` |
| `/planes` | 942 KB | **338 KB** | 390–460 ms | `no-store` |
| `/spareparts` | 913 KB | 186 KB | 300 ms | `no-store` |
| Detalle de avión | 956 KB | 114 KB | 330–390 ms | `no-store` |
| `/terms` (texto fijo) | 832 KB | 56 KB | 240–250 ms | `no-store` |

### VA-70 · La Home descarga 6,5 MB de JavaScript por un componente de íconos (crítico)
- **Causa:** `components/ui/DynamicCategoryIcon.tsx` es `"use client"` y hace `import * as …` de **14 familias completas de `react-icons`** (pi, ti, bs, tb, lu, fa, fa6, gr, tfi, md, hi2, fi, ri, gi): decenas de miles de íconos para mostrar los ~10 de las categorías de repuestos del carrusel (`SparePartCategoriesCarousel.tsx`). Resultado: un chunk de **25 MB** (6,5 MB por la red). En un celular con 4G son varios segundos solo de descarga, más varios segundos de CPU para procesarlo. **Es, por lejos, lo que más demora la Home.**
- **Hacer (cualquiera de las dos, preferida la a):**
  - **(a)** Quitar `"use client"` de `DynamicCategoryIcon` y renderizarlo **en el servidor** (en `app/page.tsx` o en un wrapper server del carrusel). Pasarle al carrusel (cliente) el ícono ya renderizado como prop `ReactNode`. Los imports de un Server Component no viajan al navegador.
  - **(b)** Reemplazar los `import *` por un mapa curado con solo los íconos que usan las categorías (`import { PiEngine, … }`) y validar en el admin de taxonomía que el nombre exista en ese mapa (un selector en vez de texto libre).
- **Aceptación:** el JS de la Home queda por debajo de 1 MB descomprimido, similar al resto de las páginas. Verificar con `npx next build` (tamaño de las rutas) y en Network.

### VA-71 · Todo el sitio es dinámico: nada se cachea en el CDN
- Todas las páginas responden `cache-control: private, no-store` y `x-vercel-cache: MISS`, incluso `/terms`, `/faq` y `/privacy`, que son texto fijo. La causa es el `Header` del layout raíz (`components/ui/Header.tsx`), que llama a `auth()` y hace un `count` de preguntas en **cada** request. Eso obliga a renderizar en el servidor cada página para cada visita.
- **Hacer:**
  - Separar la parte del Header que depende del usuario (botón de usuario, puntito rojo, link a admin) en un componente cliente que use `useSession()` (ya existe `SessionProvider`) o en un componente server envuelto en `<Suspense>`. El resto del Header (logo, links, buscador) queda estático.
  - Con eso, marcar como estáticas las páginas sin datos de usuario: `/terms`, `/privacy`, `/faq`, `/howtopublish`, `/services`, `/plans` y las de error.
  - En listados y detalles, cachear los datos públicos con `"use cache"`/`cacheLife` o `unstable_cache` (60–300 s) e invalidar con `revalidateTag` al publicar, editar o borrar. Revisar la guía de caché de Next 16 en `node_modules/next/dist/docs/` antes de elegir la API.
  - Quitar la consulta a la base del callback `jwt` en cada request (VA-13).
- **Aceptación:** `/terms` responde con `x-vercel-cache: HIT` y TTFB menor a 100 ms.


**Estado (9/10/2026):** ✅ hecho en local (commit `75c0baa`). El header ya no llama a `auth()` en el servidor: la parte del usuario es `components/ui/HeaderUser.tsx` (cliente, `useSession()` + server action `getHeaderIndicators`). "Vender" va siempre a `/publish` (el proxy redirige a `/login`). El build marca como **estáticas** `/terms`, `/privacy`, `/faq`, `/howtopublish`, `/services`, `/plans`, `/register`, `/report`, `/ads` y las de error, con `s-maxage=31536000` (en Vercel → `x-vercel-cache: HIT`; verificar en pre-production). Probado con y sin sesión: menú, punto rojo de perfil incompleto y "Completá tu perfil" en una página estática. **Pendiente**: cachear los datos de listados y detalles con tags (siguen dinámicos por los favoritos del usuario). Nota: el servidor de producción local (`next start`) pide `AUTH_TRUST_HOST` para las sesiones; en Vercel no hace falta.
### VA-72 · Fuentes duplicadas y una mal escrita
- `app/layout.tsx` descarga **Space Grotesk e Inter** con `next/font`, pero `app/globals.css` l.1–2 importa además desde Google Fonts (CSS bloqueante, de un tercero) **Montserrat, Raleway e IBM Plex Sans con todos los pesos e itálicas**, y redefine `--font-display`/`--font-body` en l.65–66. Se bajan fuentes que no se usan y hay un request bloqueante extra antes de pintar.
- **Bug:** `--font-body: 'IBM Plex Sans ', sans-serif;` (l.66) tiene un **espacio dentro de las comillas**, así que el navegador no encuentra la fuente y el cuerpo de texto cae en la sans-serif del sistema.
- **Hacer:** definir con el socio las dos fuentes reales (por lo visto, Montserrat para títulos e IBM Plex Sans para el cuerpo). Cargarlas **solo** con `next/font/google` (self-hosted, sin request a Google) con los pesos usados (por ejemplo 400/600/700/800) y `display: "swap"`. Borrar los `@import` de Google Fonts, Space Grotesk, Inter y Raleway si no se usan.


**Estado (9/10/2026):** ✅ hecho en local (commit `36a8089`). Decisión del socio: Montserrat (títulos) + IBM Plex Sans (cuerpo), con `next/font/google` (self-hosted, `display: swap`, una fuente variable por familia). Fuera los `@import` de Google Fonts, Raleway, Space Grotesk e Inter. Arreglado el bug de `'IBM Plex Sans '` (el cuerpo se veía con la fuente del sistema). Verificado: 0 pedidos a Google, el cuerpo carga IBM Plex Sans. Ojo: IBM Plex llega hasta peso 700, así que `font-black` en textos del cuerpo se ve en 700. Si el servidor de desarrollo muestra la fuente vieja, borrar `.next/dev` (caché desactualizada).
### VA-73 · Imágenes: doble hero en celular, fondos pesados, logos sin optimizar
- **Hero:** `hero-banner.tsx` tiene dos `<Image priority>`, desktop (`bkg-home2.png`) y mobile (`bkg-home-mobile.png`), ocultas con `hidden md:block`. Con `priority`, el navegador **descarga las dos** en cualquier dispositivo. Usar *art direction* con `<picture>` + `getImageProps()` de `next/image` (ver docs) para que cada dispositivo baje solo la suya.
- **Fondos y cards:** los PNG de `public/` pesan entre 2 y 3 MB cada uno (más de 40 MB en total). Next los optimiza al servirlos, pero cada variante nueva consume el **cupo de optimización de imágenes de Vercel** y el primer request es lento. Convertirlos a WebP/AVIF de 1920 px (200–400 KB) en el repo (VA-62) y usar `quality={60}` en los fondos con filtro (VA-56).
- **Logos de marcas** (`FeaturedBrands.tsx` l.75): usa `<img>` directo a Supabase. Se precargan todas, algunas en PNG grande, y la marquesina las duplica. Pasar a `next/image` con `sizes` chico (por ejemplo 144 px), `loading="lazy"`, y renderizar la lista una sola vez duplicándola por CSS si se puede.
- **Fotos de publicaciones:** con VA-30 se comprimen al subirlas (máximo 1920 px y 0,8 MB). En las cards, pasar `sizes` correctos (`(min-width:1024px) 33vw, 100vw`) para que no se pidan variantes más grandes de lo necesario.
- `public/hero-video.mp4` (8 MB) no se usa: borrarlo (VA-61).


**Estado (9/10/2026):** ✅ hecho en local (commits `32f5b21` + `9f269c1`). Hero con `<picture>` + `getImageProps()`: cada dispositivo baja solo su imagen (verificado a 375 y 1280 px). Logos de marcas con `next/image` de tamaño fijo (srcset 1x/2x, 0–1 KB cada uno, carga diferida) y copias de la marquesina ocultas para lectores de pantalla. `sizes` en la card destacada. Los fondos ya eran WebP (VA-56). `public/hero-video.mp4` y los PNG originales quedan para VA-61/VA-62.
### VA-74 · HTML de `/planes` inflado (338 KB)
- La página manda al cliente **toda la taxonomía** (todas las marcas → todos los modelos → todas las variantes) para el filtro y **todas las imágenes** de cada aeronave del listado.
- **Hacer:**
  - Imágenes de las cards con `take: 5` (VA-13).
  - En el filtro, mandar solo marcas con publicaciones activas (`where: { aircrafts: { some: activeListingWhere() } }`) y cargar los modelos de una marca cuando el usuario la tilda (ya existe `getModelsByBrand` en `filter-actions.ts`), o mandar solo id y nombre de modelos sin variantes.
  - Cachear la taxonomía (VA-13 / VA-71).
- **Aceptación:** HTML de `/planes` por debajo de 120 KB.


**Estado (9/10/2026):** ✅ hecho en local (commit `9f269c1`), sin llegar al objetivo de 120 KB: **291 → 221 KB** (gzip 26 → 19 KB). Cards con solo la primera foto en el HTML (las demás al interactuar) y filtro con solo marcas/modelos/variantes con avisos activos. Lo que queda es estructural (SVG de íconos por card, clases, srcset de la primera foto); para bajar más habría que mostrar 12 avisos por página en vez de 21 o cargar las fotos del carrusel aparte — decisión del socio.
### VA-75 · Latencia de la base de datos (verificar)
- Cada página hace varias consultas a Postgres (Supabase) desde funciones de Vercel. Si la **región de las funciones de Vercel** (por defecto `iad1`, Washington) y la **de Supabase** (por ejemplo `sa-east-1`, São Paulo) no coinciden, cada consulta cruza el continente (~120 ms ida y vuelta) y las consultas en serie se suman.
- **Hacer:**
  1. Confirmar la región del proyecto de Supabase (Settings → General).
  2. Configurar la región de las funciones en Vercel en la misma zona (por ejemplo `gru1` São Paulo para `sa-east-1`), desde Project Settings → Functions o en `vercel.json`.
  3. Verificar que `RUNTIME_DATABASE_URL` use el **pooler de Supabase** (puerto 6543, modo transacción) y no la conexión directa (5432), para no agotar conexiones con muchas funciones simultáneas. Revisar la guía de Prisma 7 + adapter `pg` + pgBouncer.
  4. Pasar las consultas secuenciales de detalles y Header a `Promise.all` (VA-13).
- **Aceptación:** TTFB de páginas dinámicas por debajo de 250 ms desde Argentina.


**Estado (9/10/2026):** ✅ verificado (9/10/2026). La URL de runtime de producción ya usa el **pooler de Supabase en modo transacción** (puerto 6543, `pgbouncer=true`); `DATABASE_URL` (5432) queda para migraciones. Supabase está en **`ca-central-1` (Montreal)**: la región por defecto de las funciones de Vercel, `iad1` (Washington), está cerca, así que no hay cruce de continente entre función y base. **Acción para el usuario**: confirmar en Vercel → Settings → Functions que la región sea `iad1` (no cambiar a `gru1`, que quedaría lejos de la base). Mover todo a São Paulo (`sa-east-1` + `gru1`) acercaría la web a Argentina, pero implica migrar la base: no hace falta ahora. Las consultas en serie ya se pasaron a `Promise.all` en VA-13.
### VA-76 · Medir antes y después
- Correr Lighthouse en modo mobile (Chrome DevTools o PageSpeed Insights) sobre `/`, `/planes` y un detalle **antes** de VA-70 y **después** de cada tarea de esta fase, y anotar Performance, LCP, TBT y CLS en `docs/perf.md`.
- Activar **Vercel Speed Insights** (`@vercel/speed-insights`, un componente en el layout) para medir con usuarios reales.
- **Objetivo:** Lighthouse mobile ≥ 85 en la Home, LCP < 2,5 s y TBT < 200 ms.


**Estado (10/10/2026):** ⏳ **parcial**. Mediciones de antes y después en `docs/perf.md` (servidor con `scripts/measure-pages.mjs` y navegador con Resource Timing). **10/10: métricas de laboratorio** con Edge sin interfaz y el perfil de celular de Lighthouse (CPU 4× más lenta, Slow 4G, caché vacía, mediana de 5): Home LCP 2,86 s · TBT 451 ms; `/planes` LCP 2,02 s · TBT 881 ms; detalle LCP 1,97 s · TBT 418 ms; CLS 0 en las tres. **LCP cumple** salvo la Home (apenas arriba de 2,5 s); **TBT no cumple** (< 200 ms). Con OK del socio: (a) **Speed Insights** instalado y en el layout (commit `356efaf`; las páginas estáticas siguen estáticas) y (b) **Swiper de las cards al interactuar** (commit `7f11a14`): primera foto fija, Swiper con `next/dynamic` al pasar el mouse, tocar o enfocar; **TBT de `/planes` 881 → 224 ms**. Verificado: sin Swiper al cargar (21 cards), el mouse lo monta y la flecha cambia de foto; a 375 px el primer gesto lo monta y el segundo cambia de foto (gesto simulado con arrastre; el toque real del celular, a probar en pre-production). **11/10:** (c) **Home estática** (commit `4682eb8`): sin leer la sesión en el servidor; favoritos y cartel de lanzamiento desde el navegador (`FavoriteIdsProvider`); `revalidate = 300` + `revalidatePath("/")` al publicar/editar/renovar/borrar; TTFB local 0,52 → 0,03 s. (d) **Menú del header al usarlo** (commit `c13d9c3`): `@base-ui` (~140 KB) se descarga al acercarse al botón. Home: JS 979 → 841 KB, **LCP 2,41 s (cumple)**, TBT 387 ms (no cumple); `/planes` TBT 207 ms. Verificado: cartel solo sin sesión, favorito marcado con sesión, menú de escritorio y de celular (con y sin sesión) abren al primer clic, cierran con Escape y vuelven a abrir. Falta: (1) PageSpeed en pre-production, (2) **activar Speed Insights en el panel de Vercel** y (3) el TBT de la Home (ver `docs/perf.md`).
---

## FASE 6 — Mercado Pago y facturación (más adelante, no ahora)

Notas para cuando se encare, a partir de lo que ya existe:
- `lib/mercadopago.ts` usa `MP_ACCESS_TOKEN` y `test-preference` usaba `MERCADOPAGO_ACCESS_TOKEN`. Unificar el nombre.
- `app/api/webhooks/mercadopago/route.ts`:
  - **No es idempotente.** Dos notificaciones simultáneas leen `PENDING` y acreditan el saldo dos veces. Hacer un `updateMany({ where: { id, paymentStatus: "PENDING" } })` dentro de `$transaction` y acreditar solo si `count === 1`.
  - Guardar `mpPaymentId` único.
  - Manejar `rejected`/`refunded`.
  - Responder 200 rápido.
  - Validar `MP_WEBHOOK_SECRET` al iniciar.
- **Cupones:** `claimCouponToProfile` crea un `CouponUsage` sin compra, y `validateCoupon` cuenta esos registros como usos. Con `maxUsesPerUser = 1`, **un cupón guardado en el perfil ya no se puede usar al pagar**. Separar "guardado" de "usado" (campo `usedAt` nullable o tabla aparte) e incrementar `currentUses` dentro de la transacción del pago aprobado.
- **Las publicaciones gratis del lanzamiento van a ser un cupón**, así que este bug de cupones hay que resolverlo antes de activarlo.
- **Renovaciones:** hoy `renewListingAction` renueva gratis e ilimitado. Definir si renovar consume saldo o cupón `RENEWAL`.
- **Facturación:** según el documento maestro (Monotributo, Factura C, `BillingProfile`, `Invoice`, proveedor).


### VA-80 · Planes de suscripción administrables, con cobro mensual por Mercado Pago (pedido del socio, 9/10)
- **No entra en el MVP**, pero queda en la lista para implementarlo más adelante. Depende de la Fase 6 (Mercado Pago) y de VA-59.
- **Hoy:** `app/plans/page.tsx` muestra planes y packs escritos en el código; sus botones van a `/checkout`, que no existe. Hay modelos `Plan` y `Subscription` en el schema, sin uso.
- **Hacer:**
  - **CRUD de planes en el panel admin** (`/admin/plans`): crear, editar y eliminar (o archivar si ya tiene suscriptores, para no romper suscripciones activas), con confirmación como en VA-59.
  - **Campos de cada plan:**
    - Título y precio mensual (y moneda).
    - **Qué incluye para la lógica interna** (campos estructurados que usa el sistema): cantidad de publicaciones de aviones y de repuestos por período, si las publicaciones **no vencen** ("sin vencimiento"), insignia de verificado, etc.
    - **Qué incluye para mostrar en `/plans`** (texto libre o lista de ítems, descripción, etiqueta "Más popular", orden).
    - Activo / inactivo.
  - **`/plans` lee los planes de la base** (solo los activos) en vez del código.
  - **Cobro:** suscripción mensual con débito automático de Mercado Pago (preapproval). Webhook que acredita el período, renueva `currentPeriodEnd` y maneja rechazos (VA de la Fase 6: idempotencia y `MP_WEBHOOK_SECRET`).
  - **Perfil:** ver el plan actual, la próxima fecha de cobro y un botón **"Cancelar suscripción"** (con confirmación) que la cancela en Mercado Pago y deja usar el plan hasta el fin del período pagado (`cancelAtPeriodEnd`).
  - **Publicaciones sin vencimiento:** si el plan lo tiene configurado, las publicaciones del suscriptor se crean y renuevan sin `listingExpiresAt` (`activeListingWhere` ya acepta `null`). Definir qué pasa cuando la suscripción se cancela (sugerido: vuelven a tener vencimiento a partir de ese momento).
  - Cambios de precio de un plan: aplican a los cobros siguientes; avisar al suscriptor.
- **Migración:** campos nuevos en `Plan` (features internas y de display, `noExpiry`, orden) y en `Subscription` si hace falta (mostrar el SQL antes de aplicar).

**Estado (11/10/2026):** ✅ **hecho en local, sin Mercado Pago ni facturación** (commit `b8ba65c`), a pedido del socio. Migración `20261011120000_va80_planes_administrables` aplicada en `va_dev` con OK: `Plan` suma `noExpiry`, `currency`, `description`, `features[]`, `badge`, `isPopular`, `showInAircraftTab`/`showInPartsTab`, `sortOrder`, `archivedAt`, `createdAt`/`updatedAt` (`Subscription` ya tenía `cancelAtPeriodEnd` y `mpSubscriptionId`). Los 5 planes que estaban escritos en `/plans` pasan a la base con los mismos textos y precios; "Aviones y Repuestos Ilimitados" queda dos veces (AR$ 180.000 en Aviones y AR$ 250.000 "Plan Pro" en Repuestos), como estaba, por decisión del socio (son de prueba). **Hecho:** (1) `/admin/plans` ("Planes" en el menú): lista con tipo, precio, qué incluye, pestañas, suscriptos y estado; alta y edición en `/admin/plans/new` y `/admin/plans/[id]` con dos bloques (lo que usa el sistema / lo que se ve en `/plans`), reglas compartidas cliente/servidor en `lib/plan-rules.ts` (zod); cambio de precio con diálogo antes → después y CONFIRMAR si es grande (como VA-59); archivar/restaurar; eliminar solo sin compras ni suscripciones (pide escribir ELIMINAR). (2) `/plans` lee los planes activos (`lib/plans.ts`, cache con tag `plans`; la primera tarjeta de cada pestaña sigue siendo el precio por aviso de VA-59). (3) `/checkout` (antes 404): resumen del plan elegido y cómo contratarlo por WhatsApp mientras no esté el pago online. (4) Perfil → Ajustes: "Tu plan" con precio, próximo cobro, "Cancelar suscripción" (diálogo; queda vigente hasta el fin del período con `cancelAtPeriodEnd`) y "Seguir suscripto". (5) Planes **sin vencimiento**: con una suscripción vigente a un plan con `noExpiry`, los avisos se crean y se renuevan sin `listingExpiresAt`. **Verificado** en el build de producción: `/plans` igual que antes (3 + 4 tarjetas, mismos precios) y botones a `/checkout?planId=…`; editar +10 % → diálogo sin CONFIRMAR → guarda y `/plans` lo refleja; validación (activo sin pestaña); crear, archivar y eliminar; un plan con suscriptos no ofrece eliminar; perfil con suscripción de prueba: cancelar y seguir suscripto. Datos de prueba borrados. **No probado de punta a punta:** crear/renovar un aviso con plan sin vencimiento (la regla está en `app/publish/actions.ts` y `app/actions/listing-actions.ts`). **Pendiente (Fase 6):** cobro con Mercado Pago (preferencia para packs, preapproval para suscripciones, webhook que acredita el período, renueva `currentPeriodEnd` y maneja rechazos), cancelar el preapproval en MP al cancelar, devolver el vencimiento a los avisos cuando termina una suscripción "sin vencimiento", aviso por mail de cambios de precio a suscriptores, créditos de los packs al publicar, y la **API de facturación**. Los `TODO Fase 6` están en `app/checkout/page.tsx` y `app/actions/subscription-actions.ts`.
---

## 7. Orden sugerido de ejecución

1. VA-01…VA-08 (seguridad) → VA-09 (SEO técnico) → VA-10 (migraciones) → **VA-30 (publicar avión)** + VA-21/22 + VA-43/44 → VA-20 (registro)
2. VA-11 → VA-31, VA-17, VA-58 (pedidos del socio del 8/10) → VA-13, VA-14 (base de datos y consultas)
3. VA-23…VA-26, VA-28, VA-29 (bugs)
4. VA-56 (fondos estándar), junto con VA-60 (responsive), porque tocan las mismas páginas
5. VA-45 (`/spareparts` roto en mobile), VA-41, VA-42 (detalle y zoom), VA-40, VA-55, VA-49, VA-50, VA-48, VA-46
6. VA-54 (campos nuevos, en la misma migración que VA-44 si es posible), VA-47 (solo el aviso), VA-52, VA-53
7. **VA-70 (íconos de la Home) apenas se pueda, porque es un cambio chico con muchísimo impacto**; después VA-71…VA-76
8. VA-12, VA-15, VA-16 → VA-61…VA-63 → VA-27 (opcional)

## 8. Decisiones pendientes (para los socios)

| # | Pregunta | Afecta | Estado |
|---|---|---|---|
| D1 | ¿Cómo se armó la base? | VA-10 | ✅ Con `db push`. Se resuelve con el baseline |
| D2 | Publicaciones gratis | VA-47 | ✅ Se definen más adelante con un cupón. Por ahora solo el aviso visual |
| D3 | Subcategorías | VA-43 | ✅ Dos niveles según la composición. 8/10: solo el Pilatus PC-12 pasa a `MT` (es monomotor turbohélice; el seed decía `BT`). El resto de los avisos son de prueba y quedan como están |
| D4 | ¿Qué formato de descripción quiere el socio? | VA-53 | ✅ Opción (a): texto libre con formato + "Ver más" en celular (9/10) |
| D5 | Campos nuevos del avión | VA-54 | ✅ Según la composición. DURG = SMOH |
| D6 | Imágenes | VA-40, 51, 52, 56 | Footer: parece listo. Logo: borrador generado. Fondos: usar los de `public/` según la tabla de VA-56 |
| D7 | ¿Es obligatorio el teléfono para publicar? | VA-46 | ✅ Sí, se bloquea publicar sin teléfono (se puede cargar en el mismo `/publish`). La foto de perfil es opcional (9/10) |
| D8 | Máximo de imágenes por publicación | VA-07 | Pendiente (sugerido 20) |
| D9 | Interpretación de los menús desplegables | VA-45, VA-48 | VA-45 ✅ confirmado en vivo. VA-48: se eligió el desplegable en el header, pero el socio después pidió sacarlo (descartado, 9/10) |
| D10 | Teléfono real del footer | VA-50 | ✅ +54 9 3456 44-5758 (9/10) |
| D11 | Publicaciones de prueba | VA-27 | ✅ No importan, no se borran |
| D14 | Hosting | VA-30, VA-70 | ✅ Vercel (límite de 4,5 MB por request). Falta confirmar la región de las funciones vs. la de Supabase |
| D12 | Modelos marcados `(PR)` en la composición: ¿"Proyecto" o "para más adelante"? | VA-43 | ✅ 8/10: "para más adelante". Las variantes heredan la categoría del modelo; Aero Commander 500 → `BP`, Turbo Commander 680 → `BT` |
| D15 | `S/C` "Sin categoría asignada" (VA-43 ítem 7) | VA-43 | ✅ 8/10: se renombra a "Otros" |
| D16 | ¿TBO obligatorio en Proyecto? (VA-44) | VA-44 | ✅ 8/10: opcional en `PR`, obligatorio en el resto |
| D13 | ¿Se muestra la matrícula públicamente? | VA-54 | Pendiente |

## 9. Checklist final antes de lanzar

- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npm run lint` sin errores nuevos.
- [ ] `npx next build` OK.
- [ ] `prisma migrate diff` (migraciones vs schema) vacío.
- [ ] Usuario B no puede editar, borrar ni renovar publicaciones de A. No-admin no puede tocar cupones ni taxonomía.
- [ ] Registro con email → mail → verificación → login OK.
- [ ] Publicar un avión Agrícola sin horas OK; un Monomotor Pistón sin horas → error claro.
- [ ] En celular (375 px): Home, `/planes`, detalle, zoom de fotos (abrir y cerrar con la X), `/spareparts`, publicar, perfil, preguntas, favoritos y admin, sin scroll horizontal.
- [ ] Publicaciones vencidas no aparecen en ningún listado público.
- [ ] Una búsqueda en el header genera **un** evento `SEARCH`, no uno por tecla.
- [ ] `/spareparts` y `/planes` a 375 px, sin scroll horizontal y con el drawer de filtros.
- [ ] Ninguna imagen rota en la Home (sin `loremflickr`/`placeholder.png`).
- [ ] Logo "VA//" visible en mobile, en la Home y en el resto de las páginas.
- [ ] Las 6 pruebas de aceptación de VA-30 (publicar avión) pasan en un celular real.
- [ ] Todas las páginas menos la Home tienen el fondo con filtro blanco y ninguna imagen de fondo da 404.
- [ ] `/robots.txt` y `/sitemap.xml` OK, títulos únicos por página, JSON-LD validado y sitemap enviado en Search Console.
- [ ] JS de la Home por debajo de 1 MB y Lighthouse mobile de la Home ≥ 85.
- [ ] `/terms`, `/faq` y `/privacy` se sirven desde la caché del CDN.
- [ ] Desplegado en producción y re-chequeado en `ventasaeronauticas.com`.


---

## Anexo A — Resumen de la "Composición de VA" relevante para el código

> El documento completo está en el proyecto de Claude ("Composicion de VA.pdf"). El socio aclaró que no todos los comentarios están actualizados: ante una contradicción con este plan, preguntá.

- **Categorías de aeronaves:** Monomotor (Pistón, Turbohélice), Bimotor (Pistón, Turbohélice), Agrícola, Experimental/LSA, Helicóptero, Proyecto. Códigos: MP, MT, BP, BT, A, H, E, PR, S/C.
- **Filtros generales:** Marca (múltiple), Modelo (múltiple), Año desde-hasta, Estado (Nuevo/Usado), Rango de precio, Publica (Particular/Intermediario/Fábrica), Con financiamiento, Toma permutas. Todos combinables entre sí.
- **Formulario de aviones:** ver la tabla de VA-54. Exenciones: horas totales (A, E, PR) y descripción de aviónica (A, PR).
- **Formulario de repuestos:** Título*, Marca, Precio (USD/ARS/a consultar)*, Estado (nuevo/usado/overholeado/a reparar)*, Imágenes*, Ubicación, Descripción*, Nº de parte, Stock*, Categoría*, Subcategoría*, Aeronaves compatibles.
- **Documentación:** PDFs opcionales. Certificación sanitaria separada de aeronavegabilidad. Matrícula y número de serie **nunca** obligatorios. Mostrar la fecha de publicación.
- **Detalle:** en Bimotor no se muestra el recuadro "Datos de motor" junto a las fotos.
- **Home:** título legible en un solo color con difuminado de fondo. Botones "VER TODO AERONAVES" y "VER TODO REPUESTOS" al ingresar. "Ver todo repuestos" en el footer (ya existe como "Repuestos en venta").
- **Ideas para más adelante (no implementar ahora):** últimos vistos en la Home, notificaciones por mail/WhatsApp/dentro de la página, reseñas, noticias, publicidad display, packs (Aviones: 1 / 3 / Broker; Repuestos: 1 / 5 / Broker; el crédito de repuestos ≈ 60 % más barato), renovaciones que terminan en publicación gratis.
- **Taxonomía de repuestos:** el árbol completo de categorías, subcategorías y atributos está en la sección "Categorías y filtros en limpio" del documento. Verificar contra `Category`/`FilterGroup`/`Filter` cargados en la base, sin rehacerlos.

---

## VA-77 · Explorar por provincia (mapa de Argentina en la Home) — pedido del socio, 9/10

**Contexto:** la provincia de los avisos (`Aircraft.province`, `SparePart.province`) es texto libre en `components/ui/PublishForm.tsx` (inputs "Ej: Buenos Aires"), lo que impide contar o filtrar bien. Hay que normalizarla antes de hacer el mapa. Colores de marca: azul `#001F58`, rojo `#E70F1F` (hover `#c5121b`). Fondo de la Home `#FAF5F5`.

**Paso 1 · Provincias canónicas**
1. `lib/provinces.ts` con las 24 jurisdicciones (nombre oficial, slug y código): Buenos Aires, Ciudad Autónoma de Buenos Aires, Catamarca, Chaco, Chubut, Córdoba, Corrientes, Entre Ríos, Formosa, Jujuy, La Pampa, La Rioja, Mendoza, Misiones, Neuquén, Río Negro, Salta, San Juan, San Luis, Santa Cruz, Santa Fe, Santiago del Estero, Tierra del Fuego, Antártida e Islas del Atlántico Sur, Tucumán. `normalizeProvince(input)` devuelve el nombre canónico o `null`: ignora mayúsculas, tildes, puntos y espacios, y reconoce alias comunes ("bs as", "bsas", "pba", "pcia de buenos aires", "provincia de buenos aires", "caba", "capital federal", "capital", "ciudad de buenos aires", "tierra del fuego", "tdf", "sgo del estero", "stgo del estero", "cordoba", "neuquen", "rio negro", "tucuman", "entre rios", etc.).
2. En `PublishForm.tsx`, reemplazar los dos inputs de provincia (aeronave y repuesto) por un `<select>` con las 24, con el mismo estilo que los demás campos. Lo mismo en cualquier otro formulario que edite la provincia de un aviso o de un perfil.
3. Validar en el servidor (actions/rutas que crean y editan avisos) que la provincia sea una de las 24: si llega un alias se normaliza; si no se reconoce, error claro.
4. `scripts/normalize-provinces.ts` para los datos existentes (Aircraft, SparePart y el perfil del usuario). Por defecto dry-run: lista "valor actual → canónico" y los no reconocidos. Con `--apply` escribe. Correrlo primero en `va_dev` y mostrar el listado al socio antes de aplicar. **No correrlo contra producción.**

**Paso 2 · Filtro por provincia en los listados**
- `/planes` y `/spareparts` aceptan `?province=<slug>`: igualdad exacta con el nombre canónico, combinado con los filtros actuales.
- Provincia en los filtros de la barra lateral (desktop y panel de filtros en mobile) y chip quitable del filtro activo, como los demás.
- Conteos con el mismo criterio de "aviso visible" de `/planes` (`status ACTIVE` y `listingExpiresAt >= ahora` o `null`), también en repuestos.

**Paso 3 · Mapa SVG de Argentina (estático y liviano)**
- Sin librerías de mapas en runtime (nada de leaflet ni react-simple-maps en el bundle del cliente).
- Paths generados una vez con `scripts/build-argentina-map.ts` (d3-geo y topojson como devDependencies) desde Natural Earth admin-1 (dominio público) o el IGN. Proyección ajustada a Argentina y simplificación para que el archivo pese menos de 60 KB.
- Salida: `components/ui/argentina-map/paths.ts`, un path por provincia (por slug) más el `viewBox`.
- Las Islas Malvinas aparecen y forman parte de Tierra del Fuego (mismo slug, se pintan juntas). En Natural Earth figuran como otro país: tomar ese polígono y asignarlo a Tierra del Fuego. La Antártida no va.
- CABA es muy chica: además, un círculo clickeable de 10–12 px sobre su ubicación que actúa igual que su path.

**Paso 4 · Componente en la Home**
- `components/ui/ProvinceExplorer.tsx`: la consulta corre en el servidor; la interacción va en un client component chico.
- Datos: en `app/page.tsx`, sumar al `Promise.all` dos `groupBy` por `province` (Aircraft y SparePart) con el criterio visible y armar `{ slug: { aircraft, parts } }`. Si VA-71 (caché) está hecho, cachearlo como el resto de la Home (por ejemplo 10 min); si no, dinámico.
- Ubicación: dentro del `<main>`, entre `<LatestAircraft />` ("Últimas publicaciones") y `<SparePartCategoriesCarousel />`. Título "Explorá por provincia", con el estilo de título de las otras secciones.
- Desktop (≥ md), dos columnas: izquierda el mapa; derecha la lista de las 24 en orden alfabético con "N avisos" (aeronaves + repuestos), las de 0 en gris, y debajo el panel de la provincia seleccionada.
- Mobile (< md): mapa arriba (ancho completo, altura contenida), debajo un `<select>` nativo "Elegí una provincia" (con su cantidad) y debajo el panel. Sin scroll horizontal a 375 px.
- Estados del mapa: base gris claro con borde blanco; con avisos azul muy suave (`#001F58` ~12 %); hover/foco rojo suave (`#E70F1F` ~45 %); seleccionada `#E70F1F` lleno. Hover en la lista resalta en el mapa y al revés. Click en mapa o lista selecciona y sincroniza el select. Transición de 150 ms, desactivada con `prefers-reduced-motion`.
- Panel: "Santa Fe · 12 aeronaves · 30 repuestos", botones "Ver aeronaves" (`/planes?province=santa-fe`) y "Ver repuestos" (`/spareparts?province=santa-fe`) con los estilos existentes. Con 0 avisos: "Todavía no hay avisos en <Provincia>. ¿Tenés algo para vender?" y botón "Publicar" a `/publish`. Antes de elegir: "Tocá una provincia en el mapa para ver sus avisos".
- Accesibilidad: cada path enfocable (`tabIndex=0`, `role="button"`, `aria-label` "Córdoba, 8 avisos"), se activa con Enter o Espacio; la lista usa `<button>`; el mapa tiene un `<title>` descriptivo.
- Rendimiento: sin imágenes nuevas; el JS que suma al cliente tiene que ser chico (solo estado de hover y selección). No reintroducir lo que resolvió VA-70.

**Aceptación**
- A 375 y 1280 px la sección aparece entre "Últimas publicaciones" y "Categorías de repuestos", sin scroll horizontal.
- Hover y selección pintan de rojo la provincia correcta; lista, select y mapa sincronizados; CABA y Tierra del Fuego (con Malvinas) seleccionables.
- Los conteos coinciden con `/planes?province=…` y `/spareparts?province=…` (al menos 3 provincias en `va_dev`).
- Publicar un aviso nuevo solo permite elegir una de las 24 provincias.
- `npx next build` pasa y el JS de la Home no crece más de ~30 KB.

**Estado (9/10/2026):** ✅ hecho en local (commit `6a9d730`), salvo aplicar la normalización (espera el OK del socio).
- **Paso 1:** `lib/provinces.ts` (24 jurisdicciones con nombre, slug y código ISO 3166-2:AR; `normalizeProvince` con alias, prefijos "Provincia de"/"Pcia." y sufijo "Argentina"). `components/ui/ProvinceSelect.tsx` reemplaza los inputs de provincia en `PublishForm` (aeronave y repuesto) y en el perfil (`ProfileView`). `app/profile/[id]/profile-client.tsx` también tiene un input de provincia, pero no se importa en ningún lado (código muerto, para VA-61). El servidor valida en `listingSchema` (crear y editar avisos): alias → canónico; desconocido → "Elegí una provincia de la lista." También `updateProfileAction`. Al editar un aviso viejo, la provincia se muestra ya normalizada.
- **Dry-run en `va_dev`** (`npx tsx scripts/normalize-provinces.ts`), **sin aplicar**: Aircraft "CABA" → "Ciudad Autónoma de Buenos Aires" (5) y "Santa fe" → "Santa Fe" (1); SparePart "CABA" → CABA canónica (8); User "CABA" (1) y "Entre Rios" → "Entre Ríos" (1). Ningún valor no reconocido. Hasta aplicarlo, esos avisos no cuentan en el mapa ni aparecen con `?province=` (igualdad exacta). El script se niega a correr contra una base que no sea local salvo con `--allow-remote`. **No correrlo contra producción** sin decisión explícita.
- **Paso 2:** `?province=<slug>` en `/planes` y `/spareparts`, sección "Provincia" en ambas barras de filtros (`ProvinceFilterSelect` en `FilterShell.tsx`) y chip quitable. **Cambio de comportamiento en `/spareparts`:** la moneda dejaba de ser opcional (sin `currency` mostraba solo USD), así que los conteos por provincia nunca iban a coincidir. Ahora sin `currency` se ven **todas las monedas**, el filtro tiene "Todas / USD / ARS" y un rango de precio sin moneda usa USD.
- **Paso 3:** `scripts/build-argentina-map.ts` (d3-geo + topojson, devDependencies) desde Natural Earth admin-1 1:10m (descargado aparte, 40,7 MB, no está en el repo). Transversa de Mercator centrada en 64° O, topología compartida, simplificación al 15 % de los vértices y 1 decimal. Resultado: `components/ui/argentina-map/paths.ts` de **21 KB** (8 KB comprimido), viewBox 320×675. Malvinas incluidas en Tierra del Fuego.
- **Paso 4:** `ProvinceExplorer` (servidor: arma el SVG, así los paths van en el HTML y no en el JS) + `ProvinceExplorerClient` (solo hover y selección, por delegación de eventos y una regla CSS). En la Home, entre "Últimas Publicaciones" y "Buscar Repuestos por Categoría". Conteos con dos `groupBy` en el `Promise.all`, **dinámicos** (el resto de la Home no está cacheado, ver VA-71). Círculo de CABA de 12 px a 1280 px.
- **Verificado:** orden de secciones y sin scroll horizontal a 375 y 1280 px. Hover desde la lista pinta el mapa, clic en el mapa marca la lista, el select en celular pinta el mapa y actualiza el panel, Enter sobre una provincia la elige. CABA (círculo) y Tierra del Fuego + Malvinas se pintan juntas. Conteos iguales a los listados en 5 provincias: Buenos Aires 8+10, Córdoba 7+7, Mendoza 6+8, Neuquén 3+4, Santa Fe 7+9. Validación: "Bs. As." y "CABA" pasan, "Narnia" da error. `next build` OK. **JS de la Home: 986 → 990 KB (+4 KB; gzip +1 KB).** El HTML crece unos 75 KB sin comprimir, porque el SVG va en el markup y en el payload de React (~17 KB comprimido).
- **Normalización aplicada en `va_dev` (9/10, con OK del socio):** 6 aviones, 8 repuestos y 2 usuarios; después, 0 pendientes. CABA pasa a 13 avisos (5 + 8), igual que los listados. **Pendiente:** (1) en producción la corre el socio, cuando lo decida (`--allow-remote`). (2) En celular, Malvinas e Isla de los Estados son muy chicas para tocarlas, pero se pueden elegir con el select.

---

## VA-78 · Guías para comprar y vender — pedido del socio, 9/10

**Cambio (9/10, pedido del socio):** las guías viven **dentro de Servicios** y con nombre en inglés: rutas `app/services/guides/page.tsx` (`/services/guides`) y `app/services/guides/[slug]/page.tsx`; slugs `buying-a-used-aircraft`, `selling-your-aircraft`, `aircraft-transfer-anac`, `aviation-glossary` (títulos visibles en español); ids del glosario en inglés y minúscula (`#smoh`, `#tbo`, `#airframe`, `#logbooks`…). Breadcrumb: Inicio › Servicios › Guías › título. Redirects permanentes (308) en `next.config.ts` de `/guias` y de cada slug viejo. **Sin link en el header ni en el menú mobile** (queda "Servicios"); el footer mantiene "Guías" en Ayuda. **`/services`** se reestructura: párrafo nuevo, bloque **"Disponible ahora"** con una tarjeta grande de las guías (ícono BookOpen, badge "Disponible", texto, links a las 4 guías y botón "Ver las guías"; toda la tarjeta clickeable, hover con borde rojo y leve elevación), bloque **"Próximamente"** con las 6 tarjetas de siempre y cierre "Estamos recién despegando." con el texto actualizado; metadata "Servicios aeronáuticos | Ventas Aeronáuticas". La sección de la Home sigue en su lugar con los links nuevos.

**Objetivo:** cuatro guías para compradores y vendedores de aeronaves: sección de tarjetas en la Home, índice `/services/guides` y una página por guía en `/services/guides/[slug]`. Contenido estático, para SEO y confianza, con el estilo de la web (azul `#001F58`, rojo `#E70F1F`, tipografías y componentes existentes). Sin dependencias nuevas (nada de MDX ni CMS). No tocar `.env`.

**1 · Contenido (`lib/guides.ts`):** `Guide[]` tipado con `slug`, `title`, `excerpt` (1–2 líneas), `audience` ("comprador" | "vendedor" | "todos"), `icon` (lucide-react), `readingMinutes` (calculado del texto), `updatedAt` ("2026-10-09"), `metaDescription` (≤ 155 caracteres) y `sections: { heading, paragraphs?, bullets? }[]`. Español rioplatense con voseo, sin relleno. **No inventar trámites, costos, plazos ni normas**: si un dato no está en la consigna, no va; donde haga falta precisión, link a la fuente oficial. Pie de cada guía: "Información general orientativa. No reemplaza el asesoramiento de un profesional ni de un taller habilitado. Última revisión: <fecha>."
- **a) `buying-a-used-aircraft`** — "Cómo comprar un avión usado: checklist de pre-compra": presupuesto total (seguro, hangar, anual/inspecciones, reserva para la próxima recorrida según horas al TBO); documentación (certificado de matrícula, certificado de aeronavegabilidad vigente, historiales de célula, motor y hélice completos y coherentes, cumplimiento de AD, certificado de dominio e inhibiciones del Registro Nacional de Aeronaves de ANAC); inspección de pre-compra en un TAR habilitado por ANAC e independiente del vendedor (compresión, boroscopía, corrosión, daños o reparaciones mayores, aviónica); coherencia de horas (TT, SMOH/DURG); vuelo de prueba; señales de alerta (historiales incompletos, apuro, precio muy bajo, seña sin ver el avión); cierre con contrato y transferencia (link a la guía de transferencia); CTA "Ver aeronaves en venta" → `/planes`.
- **b) `selling-your-aircraft`** — "Cómo vender tu avión más rápido": fotos (4 lados, panel, interior, motor con capot abierto, hélice, historiales; luz de día, avión limpio); datos completos (año, TT, SMOH/DURG, hélice, aviónica, último anual o inspección, condición de vuelo); documentación lista; precio comparando avisos similares; responder rápido; denuncia digital de venta dentro de los 30 días (ver guía de transferencia); CTA "Publicar mi aeronave" → `/publish` y link a `/howtopublish`.
- **c) `aircraft-transfer-anac`** — "Transferencia de una aeronave en Argentina (ANAC)": **solo** los datos de https://www.argentina.gob.ar/tramites/transferencia-de-aeronaves-y-motores (citada con link visible): trámite ante el Registro Nacional de Aeronaves; requisitos (solicitud de inscripción digital con domicilio legal constituido en Argentina, art. 48 del Código Aeronáutico; título del dominio; asentimiento del cónyuge si corresponde, art. 470 del CCyC, con reglas especiales si el vendedor es divorciado; declaración jurada digital de datos personales o societarios; Certificado de Dominio y de Anotaciones Personales; constancia de CUIT/CUIL/CDI; lugar de hangaraje para aeronaves; certificados de matrícula y de dominio del último titular si eran en papel); denuncia digital de venta opcional dentro de los 30 días de firmado el contrato, y si el comprador no pide la transferencia dentro de los 5 días de notificado, el Registro suspende de oficio la matriculación. Sin aranceles ni plazos: "Consultá aranceles y el estado del trámite en el sitio de ANAC". Sugerir gestor o escribano.
- **d) `aviation-glossary`** — "Glosario: TT, SMOH, TBO y más": AD, Anual, Boroscopía, Certificado de aeronavegabilidad, Célula, DURG (= SMOH; en la web son sinónimos), Historiales, Recorrida general, SB, SMOH, SPOH, TAR, TBO, TSN, TT/TTAF, Transponder y ADS-B, ELT, más otros términos técnicos del formulario de publicación. Orden alfabético, 1–2 líneas cada uno, un `id` por término.

**2 · Rutas:** `app/services/guides/page.tsx` ("Guías para comprar y vender aeronaves", 4 tarjetas) y `app/services/guides/[slug]/page.tsx` (`generateStaticParams`, `generateMetadata` con title, description, canonical y Open Graph, `notFound()`; breadcrumb, h1, "X min de lectura · Actualizada el dd/mm/aaaa", secciones con h2, aviso legal, CTA y "Otras guías"; ancho de lectura ~`max-w-3xl`). Estáticas (sin base ni cookies). Fondo estándar con filtro blanco (VA-56). JSON-LD: Article (headline, dateModified, author y publisher = Ventas Aeronáuticas), BreadcrumbList y, en el glosario, DefinedTermSet. Sitemap con `/services/guides` y las 4 guías. Link "Guías" en el footer (Ayuda); sin link en el header (cambio del 9/10).

**3 · Home (`components/ui/GuidesSection.tsx`, server component):** entre `<HowItWorks />` y `<HomeServicesCards />`. Título "Guías para comprar y vender", subtítulo "Todo lo que conviene saber antes de cerrar una operación", link "Ver todas las guías". 4 tarjetas clickeables (ícono, "Para compradores / vendedores / todos", título, excerpt, "X min"). Grilla 1 / 2 (sm) / 4 (lg) columnas, sin scroll horizontal a 375 px, sin imágenes, sin JS de cliente. Hover: leve elevación y borde rojo, sin transición con `prefers-reduced-motion`.

**4 · Links internos:** en el detalle de aeronave, debajo del contacto con el vendedor: "¿Primera compra? Leé el checklist de pre-compra" → guía a. En `/howtopublish` y en el último paso de publicar → guía b. Junto a "SMOH"/"DURG" en la ficha técnica, ícono de ayuda → `/services/guides/aviation-glossary#smoh`.

**Aceptación:** `/services/guides` y las 4 guías a 375 y 1280 px sin scroll horizontal y con el fondo estándar; la sección en la Home entre "Cómo funciona" y los servicios; `next build` las marca estáticas y la Home no suma JS de cliente; JSON-LD válido (validator.schema.org); sitemap con las 5 URLs; la guía de transferencia sin datos fuera de lo listado.

**Estado (9/10/2026):** ✅ hecho en local (commit `32c45a5`), y JSON-LD **validado en validator.schema.org (9/10): 0 errores y 0 advertencias** en Article, BreadcrumbList y DefinedTermSet (se pegó el bloque del glosario, con 4 de los 23 términos, que tienen todos la misma estructura). Contenido en `lib/guides.ts` (23 términos en el glosario; se sumaron del formulario: Apto IFR, HP, Matrícula, Número de parte y Piloto automático). La consigna pedía "link a la guía d" para la transferencia, pero la de transferencia es la c: se enlaza a la c. Tarjeta compartida `components/ui/guides/GuideCard.tsx` (compacta en celular: resumen en 2 líneas). JSON-LD en `lib/structured-data.ts` (`guideJsonLd`, `guidesIndexJsonLd`). Links: footer (Ayuda → Guías), header de escritorio y menú del celular; detalle de avión ("¿Primera compra?"), `/howtopublish`, paso 4 de `/publish` y un ícono de ayuda junto a "DURG / SMOH" en la ficha técnica (`helpHref` en `DetailRowData`). **Verificado:** `next build` → `○ /guias` y `● /guias/[slug]` (4 prerenderizadas); en producción local, `Cache-Control: s-maxage=31536000` y `x-nextjs-cache: HIT`; slug inexistente → 404 (`dynamicParams = false`); sitemap con las 5 URLs; Home JS 990,2 → 990,3 KB (solo el ítem "Guías" del menú del celular); JSON-LD parsea: Article + BreadcrumbList en cada guía, BreadcrumbList en el índice y DefinedTermSet (23 términos) en el glosario; ancla `#smoh` funciona; 375 y 1280 px sin scroll horizontal.


**Estado del cambio (9/10/2026):** ✅ hecho en local (commit `f6d8e10`). Rutas movidas con `git mv`; `GUIDES_PATH` y `guidePath()` en `lib/guides.ts` centralizan las URLs (sitemap, JSON-LD, canonical, tarjetas, Home). En `/services` la cinta diagonal "Próximamente" se reemplazó por un subtítulo con badge rojo sobre el bloque de las 6 tarjetas (queda claro que solo esas son a futuro y no tapa nada en celular); la tarjeta de guías usa un link que la cubre entera y los links internos por encima (no se anidan `<a>`). **Verificado** (build de producción local): `○ /services`, `○ /services/guides` y `● /services/guides/[slug]` (4 prerenderizadas); `/guias` y los 4 slugs viejos → 308 al nuevo; sitemap, canonical y BreadcrumbList (Inicio › Servicios › Guías › título) con las URLs nuevas; el header no tiene "Guías"; detalle → `buying-a-used-aircraft` y `aviation-glossary#smoh`; `/howtopublish` y `/publish` → `selling-your-aircraft`; `/services` y `/services/guides` a 375 y 1280 px sin scroll horizontal. En el código solo quedan las URLs viejas en los redirects de `next.config.ts`.
---

## VA-79 · Home fluida: fondo continuo con la paleta del hero — pedido del socio, 9/10

**Objetivo:** que la Home se vea como una sola pieza y no como bloques apilados (hoy: hero → `#FAF5F5` → imagen a todo el ancho de `SellerCta` → bloques `bg-[#001F58]` lisos de `HowItWorks` y `HomeServiceCards` → footer). Fondo continuo con degradés que siguen de una sección a otra, con la paleta del hero (rojos, azules, celestes). **Exclusivo de la Home:** el resto mantiene el fondo estándar con filtro blanco (VA-56).

**Paso 0 · Paleta:** sacar 4–6 colores reales del hero (celeste del cielo, blanco neblina, azul medio, rojo de marca) y definir tokens CSS acotados a `.home-theme` (`--va-navy` `#001F58`, `--va-navy-deep` ~`#00133A`, `--va-blue` ~`#0B3A8C`, `--va-sky` ~`#BFDDF7`, `--va-mist` ~`#EEF5FC`, `--va-blush` ~`#FFF3F3`, `--va-red` `#E70F1F`, `--va-red-soft`). Informar la paleta final (hex + uso).

**Paso 1 · Zonas (`app/page.tsx`):** contenedor `.home-theme relative isolate overflow-x-clip` con 4 zonas de `linear-gradient` vertical; el color con que termina una zona es exactamente el color con que empieza la siguiente.
- **Zona 1 "Cielo"** (hero + marcas + destacadas): degradé superpuesto abajo del hero que funde la foto; fondo `--va-sky` → `--va-mist`.
- **Zona 2 "Altura"** (últimas publicaciones + provincias + categorías): `--va-mist` → `--va-blush` → `--va-mist`, con 1–2 resplandores (`radial-gradient`) sobre el límite entre zonas 1 y 2.
- **Zona 3 "Puente"** (`SellerCta`): (a) imagen a todo el ancho con `mask-image` arriba y abajo, o (b) banner redondeado flotante con degradé navy → blue, acento rojo e imagen sutil. Botón con `--va-red` y hover más oscuro (en vez de `#D92D20`/`#B42318`).
- **Zona 4 "Estratósfera"** (cómo funciona + guías + servicios + footer): `--va-blue` → `--va-navy` → `--va-navy-deep`; el footer continúa ese color solo en la Home. Sin `bg-[#001F58]` lisos. Motivo "//" tenue (4–8 %) con CSS o SVG inline. Tarjetas de guías en variante oscura (vidrio).

**Paso 2 · Componentes:** `FeaturedBrands` con `mask-image` en vez de degradés `#FAF5F5`; títulos de sección unificados (navy en zonas claras, blanco en oscuras, mismo tamaño/peso, acento rojo compartido); tarjetas claras blancas con sombra azulada y borde tenue; `ProvinceExplorer` con la paleta (sin avisos en `--va-sky` claro, seleccionada en `--va-red`); espaciado vertical generoso y consistente. Si un componente se usa en otras páginas, el cambio va con `variant="home"` o una clase.

**Paso 3 · Movimiento (opcional):** resplandores con animación CSS lenta (20–30 s, solo transform/opacity), desactivada con `prefers-reduced-motion`. Sin parallax JS, sin `background-attachment: fixed`, sin `filter: blur` grandes.

**Restricciones:** solo CSS (gradientes, máscaras, SVG inline chico); cero imágenes y cero JS nuevo; el LCP sigue siendo el hero; contraste WCAG AA en todo el degradé; sin scroll horizontal a 375 px; no cambiar contenido, orden ni lógica.

**Aceptación:** capturas de página completa de la Home antes/después a 375 y 1280 px sin cortes rectos (incluido el footer); `/planes`, `/spareparts`, un detalle, `/terms` y `/guias` iguales que antes (captura de `/planes`); `next build` OK y el JS de la Home no crece; lista de contrastes; informe con paleta, opción de `SellerCta` y archivos tocados.

**Estado (9/10/2026):** ✅ hecho en local (commit `f6e4cc1`). No había skill de diseño frontend disponible ni Playwright: las capturas de página completa se hicieron con Edge headless y el protocolo de DevTools (`captureBeyondViewport`, viewport real de 1280×900 y 375×812), en `docs/capturas/va79/` (fuera del repo, en `.gitignore`).
- **Paleta final** (sacada de `home2.webp` / `home-mobile.webp`: cielo `#0857A1`–`#014B96`, nubes crema `#F0D8A8`, hangar `#0A3359`): `--va-navy` `#001F58` (marca, títulos en zonas claras, mitad de la zona 4); `--va-navy-deep` `#001331` (final de la zona 4 y footer en la Home); `--va-blue` `#0A4C96` (azul del cielo: final de la zona 3, inicio de la zona 4, provincias con avisos al 45 %); `--va-sky` `#CFE3F6` (cielo aclarado: fundido del hero, inicio de la zona 1, provincias sin avisos); `--va-mist` `#EEF5FC` (zonas 1→2→3); `--va-blush` `#FFF3F0` (centro de la zona 2, toque crema/rojo de las nubes); `--va-red` `#E70F1F` (botones, acento "//"); `--va-red-hover` `#C20D1A` (hover y links rojos sobre fondo claro); `--va-red-soft` (resplandor). Tokens en `app/globals.css` bajo `.home-theme`.
- **Zonas** (`app/page.tsx`, todo dentro de `<main class="home-theme relative isolate overflow-x-clip">`): 1 Cielo `sky → mist` (con fundido abajo del hero); 2 Altura `mist → blush → mist` con dos resplandores (`radial-gradient`, rojo y celeste) montados sobre el límite 1/2 y animación lenta (26 y 31 s, solo transform/opacity, apagada con `prefers-reduced-motion`); 3 Puente `mist → blue`; 4 Estratósfera `blue → navy → navy-deep` + footer `navy-deep` (solo en la Home, con `body:has(.home-theme) [data-site-footer]`, sin JS). Los fondos son capas absolutas en z -2 y los resplandores en z -1, así cruzan el límite sin tapar contenido. Motivo "//" en SVG inline al 6 %, dos veces en la zona 4.
- **SellerCta: opción (b)**, banner redondeado dentro del contenedor (degradé navy → blue, imagen al 30 % con velo azul, barra roja a la izquierda, botón `#E70F1F` con hover `#C20D1A`). Motivo: detrás del banner la zona pasa de claro a oscuro sin que se vea una franja; con la (a) la imagen a todo el ancho seguía leyéndose como un corte horizontal.
- **Componentes:** `SectionTitle` (`components/ui/home/SectionTitle.tsx`) unifica los 7 títulos (mismo tamaño y peso, "//" rojo; sin el subrayado de Destacadas). `FeaturedBrands` con `mask-image` (sin los degradés `#FAF5F5`) y pasa a **server component** (marquesina en CSS): **JS de la Home 990,3 → 980,7 KB**. Tarjetas en zonas claras (`.home-card` y `[data-card]` en AircraftCard/SparePartCard) blancas con sombra azulada solo bajo `.home-theme`. `HowItWorks` y `HomeServiceCards` sin `bg-[#001F58]`. `GuideCard` con `variant="dark"` (vidrio) en la Home; `/guias` sigue con la clara. Mapa de provincias con la paleta.
- **Contrastes (WCAG AA):** navy sobre sky 11,95:1, sobre mist 14,29, sobre blush 14,46; slate-600 (subtítulos) sobre sky 5,76, mist 6,89, blush 6,98; links `#C20D1A` sobre mist 5,67 / blush 5,74; provincia sin avisos slate-500 sobre blanco 4,76 (antes slate-400, 2,56: fallaba); blanco sobre `--va-blue` (punto más claro de la zona 4) 8,44; blanco/70 sobre blue 4,99; "Paso N" `#FFC2C7` sobre blue 5,55 (antes rojo, 1,80: fallaba); blanco/80 y blanco/75 sobre tarjeta de vidrio 5,42 y 5,00; blanco sobre botón rojo 4,68 (hover 6,24); blanco/90 sobre el banner 10,93; blanco/90 sobre footer 14,93; `#FF5A64` (promo) sobre navy 5,16.
- **Verificado:** `next build` OK; sin scroll horizontal a 375 px (`scrollWidth` 375); `/planes`, `/spareparts`, un detalle, `/terms` y `/guias` **idénticas píxel a píxel** a 1280 y 375 px; el LCP sigue siendo el hero (`fetchPriority="high"`, sin cambios).

---

## Pedidos del socio del 9/10 (tarde) — pendientes

> Desde el 9/10 rige `docs/DESIGN_GUIDELINES.md` (pautas de UI): toda tarea visual se hace siguiéndolas, partiendo de cómo estaba la web antes de VA-79, y los cambios grandes se proponen primero en 2 direcciones.

### VA-81 · Ruta de navegación (breadcrumb) en todas las páginas
- Como en las guías (Inicio › Servicios › Guías › título): un componente único y el `BreadcrumbList` de JSON-LD en cada página interna (listados, detalles, publicar, perfil, preguntas, favoritos, servicios, FAQ, legales, admin). La Home no lleva.
- **Estado (10/10/2026):** ✅ hecho en local (commit `0db84bf`). `components/ui/Breadcrumbs.tsx` (server, sin hooks): siempre empieza en Inicio, el último ítem es la página actual y publica `BreadcrumbList` (salvo `jsonLd={false}` en detalles de avisos y guías, que ya lo traen en su JSON-LD). Páginas: `/planes`, `/spareparts`, detalles de avión y repuesto (con el título del aviso), `/search`, `/favs`, `/questions`, `/profile/[id]` (Perfil › nombre), `/services`, `/services/guides` y cada guía (antes con ruta escrita a mano), `/faq`, `/terms`, `/privacy`, `/plans`, `/ads`, `/banners` (Espacios publicitarios › Configurá tu banner), `/howtopublish`, `/publish`, `/report` (fija arriba del formulario centrado) y todo `/admin` (`AdminBreadcrumbs`, cliente, Inicio › Admin › sección, sin JSON-LD). Sin ruta: login, registro, verificación de email, mantenimiento y sin conexión (flujos del sistema). En las páginas con mucho aire arriba (FAQ, legales, planes, publicidad, banners, cómo publicar) el `pt-16/20` del contenedor se repartió entre la ruta y el título. **Verificado** (build de producción local): las 15 páginas públicas tienen la ruta visible y exactamente un `BreadcrumbList`; capturas de `/planes`, un detalle, FAQ, una guía y `/report` a 375 y 1280 px sin scroll horizontal. **No verificado en pantalla:** las que piden sesión (`/favs`, `/questions`, `/ads`, `/banners`, `/publish`, `/admin`): la sesión de prueba venció; compilan y usan el mismo componente.

### VA-82 · Flechas de los carruseles de la Home unificadas
- "Últimas Publicaciones" y "Aeronaves Destacadas" usan chevrons grandes sueltos; "Buscar Repuestos por Categoría" usa un botón redondo blanco con sombra. Usar el mismo control en todos.
- **Estado (10/10/2026):** ✅ hecho en local (commit `a1b376e`). `components/ui/home/CarouselArrow.tsx`: botón cuadrado tipo placa (40 px, `rounded-md`, borde fino, acento rojo al pasar), igual en los tres carruseles; oculto en celular (se desliza con el dedo; tapaba la ficha).

### VA-83 · Footer único en todo el sitio, con el "//" de la marca
- El footer de la Home (VA-79, azul marino profundo y liso) le gusta al socio: llevarlo a todas las páginas y sumarle la silueta del "//" del logo, como el motivo de la zona de SellerCta.
- **Estado (10/10/2026):** ✅ hecho en local (commit `a1b376e`). `Footer` con `#001331` en todo el sitio y dos `BrandSlashes` (SVG inline, `components/ui/BrandSlashes.tsx`); sin la imagen `bkg-footer.png` (borrada) ni las reglas `body:has(.home-theme)`. Se interpretó "silueta del logo" como las barras "//" (el socio no respondió la duda): si era el isotipo "VA//" completo, se cambia.

### VA-84 · SellerCta: que se vea más la foto
- Menos filtros sobre la imagen de fondo del banner "¿Querés vender tu aeronave?", manteniendo el contraste AA del texto.
- **Estado (10/10/2026):** ✅ hecho en local (commit `a1b376e`). La foto va al 100 % (antes 30 %); el velo azul solo cubre el lado del texto (izquierda desde md, abajo en celular). Texto a la izquierda, `rounded-lg`, sin sombra grande. Contraste medido sobre la captura: fondo más claro detrás del texto L = 0,174 → blanco 4,68:1 (AA).

### VA-85 · Home, Servicios y Guías según las pautas de diseño
- Revisar la Home, `/services` y `/services/guides` contra `docs/DESIGN_GUIDELINES.md` (vidrio, grillas de tarjetas con ícono en cuadradito, elevación al hover, rounded-2xl/3xl, resplandores, centrado, copy genérico) y rediseñar partiendo de la web anterior a VA-79. Proponer 2 direcciones antes de implementar.
- **Dirección elegida (10/10, socio):** mantener los colores de fondo de VA-79, el fundido del hero más sutil pero presente, títulos de los componentes sin cambios, layouts asimétricos responsive y una mezcla de "ficha técnica" (placas de datos, números tabulares, rótulos en mayúsculas pequeñas con tracking, líneas finas) y "carta de navegación" (ruta punteada con waypoints, numerales, códigos tipo SV-01).
- **Estado (10/10/2026):** ✅ hecho en local (commit `a1b376e`). **Home:** fundido del hero de 224 a 96 px y sin franja intermedia; sin resplandores; **Destacadas** asimétrica (foto grande + "Ficha de la aeronave" con año, horas, categoría y ubicación en tabular-nums; se borró `OverlayAircraftCard`); **Categorías** como rótulos (borde fino, texto a la izquierda, ícono sin cuadradito); **Cómo funciona** como ruta de waypoints numerados con línea punteada (sin las 3 tarjetas con ícono); **Guías** asimétrica (intro + índice numerado `GuideIndex`, sin vidrio; se borró `GuideCard`); **Servicios** de la Home y **promo** con `rounded-lg`, sin elevación ni chispas; tarjetas claras con borde fino y sombra mínima; mapa de provincias con radios contenidos. **/services:** sin panel de vidrio, encabezado a la izquierda, "Disponible ahora" asimétrico (presentación + índice de guías; toda la pieza clickeable, borde rojo al pasar sin elevación), "Próximamente" como lista con códigos SV-01…SV-06 (sin tarjetas con ícono), cierre sin cohete. **/services/guides:** asimétrico (presentación + índice); **guía:** artículo `rounded-lg` sin sombra, fuente oficial como placa con borde izquierdo, botones `rounded-md`, "Otras guías" como índice. **Verificado:** `next build` OK; 375 y 1280 px sin scroll horizontal (Home, /services, /services/guides, una guía, /planes); JS de la Home 980,7 → 979 KB. Capturas en `docs/capturas/va85/` (fuera del repo).
- **Autocrítica contra "A evitar":** quedan (1) el título de `/services` "Todo el ecosistema aeronáutico, en un solo lugar." (copy genérico; se mantiene porque lo pidió el socio); (2) el texto con degradé "a bordo" del hero (pedido en VA-55); (3) las 3 tarjetas de imagen de Servicios en la Home (son fotos, no íconos; se les sacó la elevación); (4) la grilla de tarjetas de Últimas Publicaciones (usa AircraftCard/SparePartCard de todo el sitio; cambiarlas excede esta tarea); (5) títulos centrados en Destacadas, Fabricantes y Cómo funciona (el socio pidió no tocar los títulos); (6) el "//" rojo antes de cada título de sección (acento de marca, no decoración).

---

## VA-86 · "Explorá por tipo de aeronave" en la Home — pedido del socio, 10/10

- **Referencia:** `docs/mockups/referencia-tipos-aeronave.png` (7 aeronaves azules con franja roja, 2 filas de 4 + 3, nombre y descripción debajo). Imágenes ya recortadas en `public/aircraft-types/` (`.png` y `.webp`): monomotor, bimotor, agricola, helicoptero, avion-ligero, proyecto, otros. No generar ni reemplazar imágenes; `next/image` (WebP), `sizes` correctos y sin `priority`.
- **Componente** `components/ui/AircraftTypesSection.tsx` (server): título "// Explorá por tipo de aeronave" ("//" rojo solo en el título, no en cada categoría). Textos: Monomotor "Un motor a pistón, de ala alta o baja. El avión privado por excelencia."; Bimotor "Dos motores para viajar más lejos, más rápido y con más redundancia."; Agrícola "Aeroaplicadores listos para trabajar, con su equipo de aplicación."; Helicóptero "Helicópteros civiles para trabajo aéreo, traslados y uso privado."; Avión ligero "Livianos y económicos de operar, ideales para instrucción y recreación."; Proyecto "En restauración, fuera de servicio o incompletos, para ponerlos de nuevo en el aire."; Otros "Jets, turbohélices y todo lo que no entra en las categorías anteriores." Cada una enlaza a `/planes?category=<id>` (id buscado por nombre normalizado en `AircraftCategory`; si no coincide, no crear: proponer correspondencia y esperar confirmación). Cantidad de avisos visibles por categoría con `groupBy` y el criterio de `/planes`; con 0, "Sin avisos por ahora" en gris.
- **Diseño:** aeronaves grandes sin cajas ni bordes; nombre `#001F58` fuerte y descripción gris, centrados bajo la imagen. ≥ lg: 4 + 3 centradas; tablet: 3 columnas; celular: carrusel con scroll-snap mostrando 1,5 aeronaves, solo CSS. Hover/foco: la aeronave avanza ~6 px (translateX) y el nombre se subraya en rojo; transición corta, sin movimiento con `prefers-reduced-motion`; foco visible. Imágenes alineadas por la base en una caja de altura fija.
- **Ubicación:** después de `<FeaturedBrands />` y antes de "Aeronaves destacadas", dentro de la zona 1 "Cielo", sin fondo propio.
- **Aceptación:** 375, 768 y 1280 px como la referencia, sin scroll horizontal; links y cantidades coinciden con `/planes`; `next build` OK y sin JS de cliente.
- **Correspondencia confirmada por el socio (10/10):** Monomotor → MP + MT; Bimotor → BP + BT; "Experimental / Avión ligero" (nombre ajustado para acercarlo al de la base) → E; Agrícola → A; Helicóptero → H; Proyecto → PR; Otros → S/C. Texto de Otros ajustado a "Jets y todo lo que no entra en las categorías anteriores." (los turbohélices tienen categoría propia).
- **Estado (10/10/2026):** ✅ hecho en local (commit `c2d85a8`). `components/ui/AircraftTypesSection.tsx` (server) dentro de la zona 1, entre las marcas y Destacadas; cantidades con un `groupBy` por `categoryId` en el `Promise.all` de la Home (criterio `activeListingWhere`). Imágenes `.webp` con `next/image` (`fill`, `object-contain object-bottom` en una caja de altura fija, `sizes` por ancho, sin `priority`). Carrusel de celular con `scroll-snap` (64 % de ancho por aeronave, scrollbar oculta), 3 por fila desde md y 4 + 3 centradas desde lg. Hover/foco: la aeronave avanza 6 px y el nombre se subraya en rojo; sin movimiento con `prefers-reduced-motion`; anillo de foco rojo. **Verificado:** sin scroll horizontal a 375, 768 y 1280 px; las 7 cantidades coinciden con `/planes` (Monomotor 8, Bimotor 5, Agrícola 7, Helicóptero 6, Experimental / Avión ligero 5, Proyecto 3, Otros 4); JS de la Home sin cambios (979 KB); `next build` OK. Nota: el texto de Monomotor dice "Un motor a pistón" pero el link incluye también los turbohélices (MT), como se decidió. Desvío de las pautas: el título va centrado, como los de Fabricantes y Destacadas que lo rodean en la zona 1.
- **Ajuste del socio (10/10):** en escritorio se mantienen las filas de 4 + 3, con imágenes y textos un 15 % más chicos (no el título); en celular, en vez del carrusel, grilla de 2 por fila que se recorre bajando, con la séptima sola y centrada. Tablet sigue en 3 por fila. **Estado:** ✅ hecho (commit `b1b1338`); verificado a 375, 768 y 1280 px sin scroll horizontal.

---

## VA-87 · Sesión con Google, menú, tipo de perfil y página personalizada — pedido del socio, 10/10

> El socio la pidió como "VA-80", pero ese número ya era "Planes de suscripción administrables" (no MVP): se registra como VA-87. El punto 5 (SellerCta como banner) se canceló: el socio pidió dejarlo como está. Junto con esta tarea se pidió que "Aeronaves destacadas" vuelva a verse como antes de VA-85.

1. **Falso "falta verificar email" con Google.** Reproducir en `va_dev` (usuario nuevo y uno existente con contraseña). Si Google confirma el email, `User.emailVerified` queda con fecha (también al vincular) y la sesión expone el dato leído de la base. Explicar la causa real.
2. **Menú y punto rojo.** Punto fijo (sin `animate-pulse`), en el botón del menú (escritorio y hamburguesa) y al lado del ítem pendiente, solo con algo pendiente de verdad. Sacar "Completar perfil" del menú (se completa desde "Mi perfil").
3. **Tipo de perfil.** Selector de `User.userType` en la edición del perfil, con las etiquetas de `/register`; quien entra con Google por primera vez lo elige una sola vez; validación en el servidor; `ProfileView` muestra la etiqueta en español.
4. **"Página personalizada" como beneficio de un plan.** `Plan.includesCustomPage` (default false); toggle en el admin de planes (si no existe, dejar el campo y avisar); regla en `lib/subscriptions.ts` → `hasCustomPage(userId)` (Subscription ACTIVE, `currentPeriodEnd` futuro, plan con el beneficio). Con el beneficio, `/profile/[id]` cambia solo el diseño (portada, logo, nombre comercial, insignia, descripción, contacto, avisos con pestañas); campos opcionales `businessName`, `bio`, `coverUrl`, `logoUrl`, `website`, `instagram`, `whatsapp`, editables solo con el beneficio; imágenes a Supabase comprimidas en el cliente (4,5 MB de Vercel). Si vence, vuelve al perfil común sin borrar nada.
5. ~~SellerCta como banner~~ (cancelado por el socio).

**Estado (10/10/2026):** ✅ hecho en local (commit `839c15c`).
- **Causa real del aviso:** Auth.js crea los usuarios de OAuth con `emailVerified: null` a propósito (`@auth/core/lib/actions/callback/handle-login.js`, `createUser({ ...profile, emailVerified: null })`), así que el `emailVerified` que devolvía nuestro `profile()` de Google nunca llegaba a la base; y al vincular Google a una cuenta existente (`allowDangerousEmailAccountLinking`) no actualiza el usuario. En `va_dev` las 6 cuentas de Google tenían `emailVerified` vacío. `lib/profile.ts` solo exige la verificación a cuentas con contraseña, por eso el aviso ("Falta: Email verificado" y "Completá tu perfil" en el menú) le aparecía a quien se registró con email y después entró con Google. **Arreglo:** `events.signIn` en `lib/auth.ts` guarda `emailVerified` si Google confirma el email (nuevo o vinculado) e invalida el caché de completitud; el `jwt` lee `emailVerified` y `userTypeConfirmed` de la base y la sesión los expone (`session.user.emailVerifiedAt`, `userTypeConfirmed`). Las cuentas de Google existentes se corrigen solas en el próximo login. **No probado con un login real de Google** (no se puede iniciar sesión con un proveedor externo desde acá): probar con una cuenta nueva y con una que ya tenga contraseña.
- **Menú:** `PendingDot` fijo `#E70F1F` en el botón (escritorio y hamburguesa, con `aria-label` que lo dice) y al lado de "Mis consultas"; fuera "Completá tu perfil" y el indicador de perfil incompleto del header (`getHeaderIndicators` ahora solo consulta preguntas).
- **Tipo de cuenta:** `lib/user-types.ts` (opciones y etiquetas, las de `/register`; `parseSelectableUserType` valida en el servidor). Selector en "Mi perfil" → `updateProfileAction`. Migración `20261010120000_va87_tipo_cuenta_y_pagina_personalizada` (columnas `userTypeConfirmed`, `businessName`, `coverUrl`, `logoUrl`, `website`, `whatsapp` en `User` y `includesCustomPage` en `Plan`; marca confirmado a quien tiene contraseña), aplicada en `va_dev` con OK del socio. Primer login con Google → `pages.newUser` → `/onboarding/account-type` (form de servidor; si ya está confirmado redirige al perfil). `/register` guarda `userTypeConfirmed: true`.
- **Página personalizada:** `lib/subscriptions.ts` → `hasCustomPage`. **No existe el admin de planes** (eso es VA-80): el campo `includesCustomPage` quedó en la base sin toggle. `components/ui/profile/StorefrontHeader.tsx` (portada, logo o inicial, nombre comercial, insignia "Tienda oficial", tipo de cuenta, descripción y placa de contacto con ubicación, WhatsApp, web, Instagram y Facebook) y `StorefrontEditor.tsx` (en "Mi perfil", solo con el beneficio; portada y logo comprimidos con `browser-image-compression` y subidos con `uploadStorefrontImageAction`). `bio` e `instagram` ya existían en `User`. Si la suscripción vence, se ve el perfil común y los datos quedan.
- **Aeronaves destacadas:** vuelve el diseño original (tarjetas de foto con marca, modelo, precio y año encima; `OverlayAircraftCard` restaurado de `a1b376e^`), con las flechas unificadas de VA-82.
- **Verificado** (build de producción local con datos de prueba en `va_dev`, borrados después): menú con y sin pendientes a 375 y 1280 px; perfil personalizado (plan de prueba con el beneficio) y perfil común; con la suscripción vencida vuelve el común; pantalla de tipo de cuenta a 375 y 1280 px. Las capturas con sesión usaron una cookie de sesión de prueba generada localmente con `AUTH_SECRET`.

---

### VA-83 (spec) · Mapa en el detalle + Comparador de aeronaves (pedido del socio, 11/10)
> Especificación completa: `docs/specs/VA-83-comparador.md`. Ojo: el número VA-83 ya se había usado para otra tarea (flechas de carrusel); esta es la del spec. Orden: primero la Parte 0 (mapa) y, verificada, el comparador.

**Estado (11/10/2026):** ✅ **hecha en local**: Parte 0 (commit `c172696`) y comparador (commit `bfb5bc8`, con el OK del socio). Además, menú desplegable de Servicios (commit `012f196`).

**Comparador:**
- **Una sola fuente de campos:** `lib/aircraft-fields.ts` (secciones en el orden del spec, etiquetas, valor, mejor valor y cómo se muestra en el detalle). `lib/listing-detail.ts` (ficha web e impresión) y el resumen del detalle se arman desde ahí, igual que el comparador. Se sumó **"Matrícula"** (`plate`): el formulario la guardaba pero no se mostraba en ningún lado; ahora sale en el resumen del detalle y en el comparador. **Revisar con los socios** si era a propósito.
- **Selección:** botón "Comparar"/"Agregado" en `AircraftCard` (abajo a la izquierda de la foto), `OverlayAircraftCard` y el detalle (junto a favoritos). **Bandeja** fija abajo (`components/ui/compare/CompareTray.tsx`, montada en el layout, con un espaciador para no tapar el footer): miniaturas con "x", "Comparar (n)" activo desde 2, aviso "Podés comparar hasta 3. Quitá una para agregar otra.", en celular "n de 3" con desplegable. Estado en `localStorage` (`lib/compare-store.ts`, con try/catch y sincronizado entre componentes y pestañas).
- **`/planes/compare?ids=a,b,c`** (noindex): datos con `getAircraftDetail` y el criterio de visibilidad de `/planes` (`isListingActive`); filas armadas en el servidor (`lib/compare-rows.ts`) y una tabla cliente chica (`CompareTable`). Encabezado de columnas fijo arriba (foto, título, precio, ubicación, "Ver aviso", "Quitar"); "—" en vacíos; bimotores con "Motor 1: … / Motor 2: …" en la misma celda; **mejor valor** (negrita + punto rojo) en precio, año, horas totales, horas del motor, SMOH y horas de hélice (en bimotores cuenta el motor más usado); "Mostrar solo diferencias"; aviso no disponible ("Este aviso ya no está disponible", se puede quitar); lugares vacíos con "+ Agregar aeronave" y buscador (`searchAircraftForCompare`: solo visibles, por título, marca o modelo). Las aeronaves siempre están en US$ (el modelo no tiene precio en pesos), así que no hay mezcla de monedas; igual no se convierte nada.
- **Celular:** etiquetas fijas a la izquierda (120 px), columnas de 160 px con scroll-snap y `scroll-padding`; el encabezado acompaña el desplazamiento lateral; la página no tiene scroll horizontal.
- **"Comparar con similares"** en el detalle (`lib/similar-aircraft.ts`): misma categoría y precio ±40 % (si no hay precio, las más nuevas de la categoría), el más cercano primero; botón "Comparar 3".
- **Sin dependencias nuevas.**
- **Verificado** (dev y build de producción): agregar desde tarjetas (3 y el aviso al intentar la cuarta), bandeja, comparar 2 y 3, quitar, buscar y completar, URL compartible (la bandeja se sincroniza con la URL), "solo diferencias" (38 → 28 filas), bimotor con Motor 1/2, agrícola con implementos, aviso pausado con su cartel (dato restaurado), similares en un aviso con coincidencias; encabezado fijo al bajar a 375 y 1280 px; scroll lateral sincronizado con un gesto real; sin errores de consola.

**Menú de Servicios** (pedido del socio, referencia: menú de adidas): al pasar el mouse por "Servicios" (o al llegar con Tab) se abre un panel a todo el ancho con la presentación, **Guías** (las 4, numeradas, y "Ver todas las guías") y **Herramientas → Comparador de aeronaves**. `components/ui/ServicesMenu.tsx`: componente de servidor, solo CSS (sin JS) y sin traer el contenido de las guías; para sumar una sección se agrega a `SERVICE_SECTIONS`. En celular, las secciones van debajo de "Servicios" en el menú.
- **Coordenadas:** migración `20261010234835_va83_coordenadas` con `prisma migrate dev` en `va_dev` (`latitude`/`longitude` DOUBLE PRECISION opcionales en `Aircraft` y `SparePart`).
- **Geocodificación** (`lib/geocode.ts`): API Georef, endpoint `localidades` con la provincia canónica (`lib/provinces.ts`, los 24 nombres coinciden con Georef) y el centroide. Primero búsqueda exacta; la aproximada solo se acepta si el nombre difiere en 2 letras o menos, sin contar un artículo inicial ("Amstrong" → Armstrong, "Conquistadores" → Los Conquistadores; "San Fernando" no cae en "San Bernardo"). En CABA, si la ciudad dice "CABA", "Capital Federal", etc., se usa el centroide de la ciudad. Timeout de 4 s; si falla o no encuentra, el aviso se guarda sin coordenadas y se registra (`[geocode] aviso sin coordenadas`). Se llama en `createListing` y en `updateListing` (solo si cambió la ciudad o la provincia, o si todavía no tenía coordenadas).
- **Script** `scripts/geocode-listings.ts` (dry-run por defecto, `--apply`, `--all`, pausa de 400 ms, solo base local): en `va_dev` resolvió **72 de 86 avisos** (13 de 14 localidades). Quedan **14 sin resolver: "Buenos Aires, Buenos Aires"** (la ciudad es ambigua: no hay una localidad con ese nombre en la provincia; hay que corregir el dato).
- **Mapa** (`components/ui/ListingLocationMap.tsx` + `LeafletZoneMap.tsx`, Leaflet 1.9): import dinámico `ssr: false` recién cuando el bloque entra en pantalla (IntersectionObserver), placeholder del mismo alto; círculo de 5 km en `#E70F1F` semitransparente, sin marcador; "Ubicación aproximada: Ciudad, Provincia"; sin zoom con la rueda, con botones de zoom; 220 px en celular y 260 px en escritorio; placa con rótulo "Zona" (pautas de diseño). En el detalle de aeronave y de repuesto, en la columna del vendedor (en celular, después del vendedor). Reutilizable (props: coordenadas, ciudad, provincia, radio y rótulo) para hangares y pistas. Si el mapa falla, el aviso se sigue viendo.
- **Teselas:** **Stadia Maps** ("Alidade Smooth"). CARTO ya pide clave (sin clave devuelve un cartel "API KEY REQUIRED") y MapTiler también. Stadia anda sin clave en localhost y en producción autoriza por **dominio**: hay que crear la cuenta y registrar el dominio (sin clave en el código). Opcional: `NEXT_PUBLIC_STADIA_API_KEY` (no está en el `.env`). **Revisar el plan de Stadia** para uso comercial.
- **Verificado** en el build de producción con Edge, en 8 avisos de 8 provincias (Buenos Aires, CABA, Córdoba, Corrientes, Entre Ríos, Mendoza, Neuquén, Santa Fe) a 375 y 1280 px: 0 pedidos del mapa antes de hacer scroll, círculo en la ciudad correcta, teselas cargadas, atribución visible, sin scroll horizontal. Editar un aviso de Córdoba a "Villa Carlos Paz" guardó las coordenadas nuevas (−31,418, −64,494) y el mapa mostró la ciudad nueva (dato restaurado después). **No probado por el formulario:** el alta (usa la misma función).
- **Bug encontrado y arreglado en el camino:** con el mapa visible al cargar, `circle.getBounds()` fallaba (el mapa todavía no tenía vista) y la página entera mostraba el error 500; ahora el encuadre se calcula desde el centro y el radio, y cualquier falla del mapa queda dentro del bloque.

---

### VA-87 (spec) · PDFs actualizados con QR + logos al revés en la Home (pedido del socio, 11/10)
> Especificación: `docs/specs/VA-87-pdfs-qr-y-logos.md`. Ojo: el número VA-87 ya se había usado (Google, menú, tipo de cuenta, página personalizada); esta es la del spec. La Parte B (logos) se hizo el 11/10 (commit `e90746c`, ver VA-83 arriba en el registro). El **PDF de hangares** va con VA-84 o después.

**Estado (11/10/2026):** ✅ **Parte A hecha en local** (commit `696d451`). Pendiente: PDF de hangares (con VA-84) y escanear el QR con un celular (ver abajo).
- **Un solo componente** `components/pdf/ListingPDF.tsx` (aeronave y repuesto; el de hangares lo reutiliza) armado por `lib/listing-pdf.tsx`; las rutas `/api/aircraft/[id]/pdf` y `/api/spareparts/[id]/pdf` quedan de una línea. Se borraron `components/ui/AircraftPDF.tsx` y `SparePartPDF.tsx`.
- **Contenido aeronave** (`lib/pdf-sections.ts`): la lista única `lib/aircraft-fields.ts` de VA-83, con las mismas secciones y orden del detalle y el comparador (Características, General, Motor —Motor 1 / Motor 2 en bimotores—, Hélice, Aviónica, Equipamiento, Exterior, Interior, Implementos agrícolas si corresponde, Documentación, Condiciones de venta); sin campos vacíos y, en los de sí/no, solo los "Sí". La descripción va en su bloque y el precio arriba. **Repuesto:** las mismas funciones del detalle (General con P/N, categoría, estado y stock; compatibilidad; atributos; moneda).
- **Encabezado:** logo del header (`logo-full-blue.png`, sin espejar), tipo de ficha, referencia y fecha; título, precio y "Publicado el … · Ubicación aproximada: Ciudad, Provincia", como en el detalle. Se repite en cada página.
- **Vendedor** (`pdfSeller`): nombre (o nombre comercial si tiene página personalizada), tipo de perfil, insignias "Vendedor verificado" (plan con `includesVerifiedBadge` vigente) y "Página personalizada", ubicación, teléfono y email (los que la web ya expone en los botones de contacto) y, con página personalizada, WhatsApp y web. Nada que no sea público. Antes el PDF recibía la fila entera del usuario.
- **Fotos:** la principal (1100 px, JPEG 70) y hasta 4 miniaturas (360 px, JPEG 62), comprimidas con `sharp` (viene con Next; @react-pdf no lee WebP). Si una foto no se puede bajar, se omite.
- **QR** (`qrcode`, la excepción aprobada en el spec): se genera en el servidor como PNG en data URL; apunta a la URL canónica (`NEXT_PUBLIC_SITE_URL`) con `?utm_source=pdf&utm_medium=qr`; 2,5 cm en el pie de la primera página, negro sobre blanco con margen de silencio de 4 módulos, con "Escaneá para ver el aviso actualizado, más fotos y contactar al vendedor" y la URL corta escrita debajo. Las demás páginas llevan "Título · Página n de N".
- **Acceso:** los avisos visibles los baja cualquiera; los que no (pausados, vencidos, vendidos), solo el dueño o un admin, con el aviso "Este aviso no está disponible al público en este momento"; para el resto, 404 (antes cualquiera podía bajar el PDF de cualquier aviso). El QR lleva igual al detalle, que muestra su cartel de no disponible.
- **Verificado** (build de producción): PDFs de un monomotor con todos los campos (3 páginas, 81 KB), un bimotor (78 KB), un agrícola con implementos (75 KB) y un repuesto (66 KB): texto extraído de cada PDF y comparado con su detalle, sin faltantes; vistos con el visor de PDF de Edge (secciones cortas sin partirse, numeración, QR). Aviso pausado: visitante 404, dueño 200 con el aviso; restaurado. Todos muy por debajo de 2 MB (las fotos de prueba son chicas; con fotos reales, estimado 300–600 KB).
- **Falta:** escanear el QR con un celular (no se puede desde acá: se adjuntan los PDF) y el PDF de hangares (con VA-84).
