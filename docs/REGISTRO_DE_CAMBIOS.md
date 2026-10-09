# Registro de cambios — Ventas Aeronáuticas

Todo lo hecho sobre el plan `docs/PLAN_FIXES_MVP.md`, en orden, con el commit y dónde verlo.
Rama: `milton/auth-roles` (sin push). Las URLs son de `npm run dev` → http://localhost:3000.

**Progreso:** 31 de 59 tareas hechas (VA-01 a VA-11, VA-13, VA-14, VA-17, VA-20 a VA-26, VA-28 a VA-31, VA-43, VA-44, VA-54, VA-57, VA-58 y VA-70). Faltan 28 (el 8/10 se sumaron VA-17, VA-31 y VA-58, pedidos del socio). La Fase 6 (Mercado Pago) no está numerada y no entra en la cuenta.

---

## Fase 1 — Seguridad y permisos ✅ completa

| Tarea | Commit | Qué cambió | Dónde verlo |
|---|---|---|---|
| VA-01 | `dc2d289` | Renovar, borrar y editar un aviso exige sesión y ser el dueño (o admin): `lib/listing-auth.ts` → `assertListingOwner`. | Perfil → tus avisos. Sin sesión o con otro usuario, la acción falla. `app/actions/listing-actions.ts` |
| VA-02 | `f4fed19` | Las actions de cupones exigen admin. | `/admin/coupons` · `app/actions/coupons-actions.ts` |
| VA-03 | `aaf4f65` | Grupos de filtros y filtros de repuestos exigen admin. | `/admin/taxonomy` · `app/actions/admin-taxonomy-actions.ts` |
| VA-04 | `20a3b29` | `app/middleware.ts` (no corría) → `proxy.ts` en la raíz con `auth()`. Protege `/publish`, `/favs`, `/questions`, `/ads`, `/banners` y `/admin` (este último, solo admin). El login respeta `callbackUrl` (solo rutas internas). | Sin sesión, entrar a `/favs` → `/login?callbackUrl=/favs` · `proxy.ts`, `components/ui/LoginForm.tsx` |
| VA-05 | `6775398` | Borrados `app/api/test-preference` y `app/testmp`. | `/testmp` da 404 |
| VA-06 | `9a166c7` | Mail de publicación asistida: exige sesión, valida campos, escapa HTML, usa `EMAIL_FROM` y la nueva `SUPPORT_EMAIL`. La purga de analíticas ya no borra si falla el mail del respaldo. | `/publish` → "Publicación Asistida" · `app/publish/actions.ts`, `app/admin/actions.ts`, `lib/mail.ts` |
| VA-07 | `27e0ff5` | Archivos: tipo real por los primeros bytes, solo JPG/PNG/WebP de hasta 10 MB, extensión según el tipo, máximo 15 fotos (D8). Aplica a avisos, avatar y logos de marca. | `/publish`, avatar del perfil, `/admin/taxonomy` · `lib/upload-validation.ts` |
| VA-08 | `dc8c607` | Reportes y preguntas: largo máximo de 1000, la publicación tiene que existir, no te podés preguntar a vos mismo, `answeredAt` se guarda. | `/report?aircraftId=…`, preguntas en un detalle, `/questions` · `app/api/reports/route.ts`, `app/actions/questions.ts` |

## Fase 1 bis — SEO (VA-09) ✅

| Punto | Commit | Qué cambió | Dónde verlo |
|---|---|---|---|
| Metadata base | `b17de96` | `metadataBase`, título con template, descripción real, Open Graph `es_AR`, `lang="es-AR"`. | `<head>` de cualquier página · `app/layout.tsx`, `lib/site.ts` |
| Títulos por página | `dbdb1d1` | Título, descripción y canonical en `/planes`, `/spareparts`, `/faq`, `/howtopublish`, `/services`, `/terms`, `/privacy`, `/login`, `/plans` y `/register`. `/search` con noindex. | La pestaña del navegador en cada página |
| Detalles | `86a2537` | `generateMetadata`: "Marca Modelo Año en venta – USD …", foto como `og:image`, noindex si el aviso no está activo, 404 real si no existe. | Un detalle de avión o repuesto · `lib/listing-data.ts`, `lib/listing-seo.ts`, `lib/listing-filters.ts` |
| h1 | `5d2bc26` | Un solo `<h1>` por detalle, con el título del aviso. | Detalles |
| robots | `ca4a42d` | `app/robots.ts`. | `/robots.txt` |
| sitemap | `6b64897` | `app/sitemap.ts` con avisos activos, revalidación cada 1 h. | `/sitemap.xml` |
| Canonical de listados | `6d0e834` | Con filtros apunta al listado base; `?page=N` apunta a sí mismo. | `/planes?page=2` |
| JSON-LD | `a4dce07` | Organization + WebSite (Home), Product + BreadcrumbList (detalles), FAQPage (`/faq`, solo cuando tenga preguntas reales). | Ver código fuente → `application/ld+json` · `lib/structured-data.ts` |
| OG, manifest e íconos | `1781b60` | Imagen OG por defecto, `/icon`, `/apple-icon` y `manifest.webmanifest`. | `/opengraph-image`, `/icon`, `/manifest.webmanifest` |
| alt de fotos | `1e62b90` | "{título} – foto {n}" en la galería. | Detalles · `components/ui/Carousel.tsx` |
| Canonical de la Home | `2417014` | | `<head>` de `/` |

## Fase 2 — Base de datos

| Tarea | Commit | Qué cambió | Dónde verlo |
|---|---|---|---|
| VA-10 | `2fd957f` | Migración `20261008145019_baseline_db_push` (lo que se había aplicado con `db push`), marcada como aplicada en `va_dev`. `build` ya no migra; nuevo script `migrate:deploy`; regla en el README. | `prisma/migrations/`, `package.json`, `README.md`. **Pendiente en producción:** ver los comandos en el plan, debajo de VA-10 |
| VA-11 | `43316d9` | **Índices faltantes** (migración `20261008225811_va11_indices`, solo índices). Listado activo: `Aircraft(status, listingExpiresAt, createdAt)` y `SparePart(status, inPesos, createdAt)` reemplazan a `[status]`; `sellerId` y `categoryId` en ambos; imágenes por `(padre, order)`; motores, hélices y documentos por `aircraftId`; `AnalyticsEvent.createdAt`; leads por publicación; `CouponUsage`, `Account` y `Session` por `userId`. Comprobado con `EXPLAIN` que el listado, las imágenes y el perfil usan los índices nuevos. | Sin cambio visible. `prisma/schema.prisma`, `prisma/migrations/20261008225811_va11_indices/migration.sql` |
| VA-17 | `0efcb83` | **Vistas contadas solo al entrar al detalle** (pedido del socio). Antes se registraban en el render del servidor y sumaban con cada refresh, server action, vuelta atrás o bot (hasta 4 vistas en 1,5 s). Ahora el componente cliente `TrackListingView` llama a `logListingView` una vez por pestaña y publicación; el servidor ignora publicaciones inactivas, al dueño y repeticiones del mismo usuario en 30 min. | Entrar a un detalle y recargar: la tabla `AnalyticsEvent` suma 1 sola vez. `components/ui/listing/TrackListingView.tsx`, `app/actions/analytics-actions.ts` |
| VA-13 | `70d9e19` | **Menos consultas por página.** Home: una query de aeronaves en vez de dos. Detalle: el vendedor viene en la misma consulta (solo campos públicos) y la sesión en paralelo. Header: puntito de preguntas cacheado 60 s por usuario. `jwt`: `isAdmin` al loguear o cada 5 min, no en cada request. `/planes`: 5 imágenes por card y taxonomía cacheada. `/spareparts`, su filtro y la Home usan las categorías cacheadas. `/search` paginado de verdad. Las actions de taxonomía invalidan la caché. | Sin cambio visible. `lib/cached-data.ts`, `lib/listing-data.ts`, `components/ui/Header.tsx`, `lib/auth.ts`, `app/search/page.tsx` |
| VA-14 | `62ebcb8` | **Vencidas fuera de todos lados.** `activeListingWhere()` en Home, `/planes`, `/spareparts`, `/search`, buscador del header, perfil público y panel admin. El detalle de repuesto vencido muestra a terceros el aviso "Publicación pausada o inactiva", igual que el de avión. | Vencer un aviso en la base (`listingExpiresAt` en el pasado) y buscarlo. `lib/listing-filters.ts`, `components/ui/listing/InactiveListingNotice.tsx` |

## Fase 3 — Publicar (prioridad n.º 1)

| Tarea | Commit | Qué cambió | Dónde verlo |
|---|---|---|---|
| VA-20 | `ebb299e` | **Registro con email y contraseña funcionando.** El registro crea un token (24 h) y manda el mail; nueva `/verify-email` que activa la cuenta y redirige a `/login?success=EmailVerified`; "Reenviar mail de verificación" en el login (respuesta genérica, máx. 1 por minuto); Auth.js devuelve `res.code = "EmailNotVerified"`. **Bug previo arreglado:** el formulario de login nunca hidrataba (`useSearchParams` dentro de `<Suspense>`), así que el login con contraseña no funcionaba y la contraseña se mandaba por GET en la URL; ahora la página pasa los parámetros como props y login/registro usan `method="post"`. | `/register` → mail → link → `/login` · `lib/verification.ts`, `app/verify-email/page.tsx`, `app/actions/verification-actions.ts`, `components/ui/LoginForm.tsx` |
| VA-22 | `23104ab` | Sin datos inventados: `certDate` y `passengers` vacíos quedan en `null`, año y horas inválidos dan error claro y una categoría inválida se rechaza. | `/publish` |
| VA-30 (alta) | `ead98b0` | Fotos comprimidas en el navegador (~650 KB, 1920 px) y subidas **directo a Supabase** con URLs firmadas: ya no importa el límite de 4,5 MB de Vercel. Esquema Zod único (`lib/listing-schema.ts`) con errores junto a cada campo. `createListing` devuelve `{ ok, id, url }` y redirige al aviso. Doble clic → un solo aviso. Si algo falla, se borran los archivos subidos. | `/publish`: publicá con muchas fotos de celular. Archivos: `lib/listing-uploads.ts`, `lib/listing-upload-client.ts`, `lib/supabase-browser.ts`, `components/ui/PublishForm.tsx` |
| VA-21 | `3e498ef` | El tipo de motor sale de la categoría (MP/BP → pistón, MT/BT → turbohélice); se quita el selector manual. Cerrada junto con VA-43. | `/publish`: ya no aparece "Tipo de Motor" |
| VA-30 (edición) | `829b71e` | "Editar" en el perfil abre el mismo formulario (`/publish?edit=<id>&type=aircraft\|parts`): cambia fotos, documentos, motores, hélices, marca, modelo y categoría. Se borraron las actions sin uso, incluidas `createAircraft` y `createSparePart`, que permitían crear avisos sin sesión. | Perfil → ✏️ en un aviso · `lib/listing-edit.ts`, `app/publish/actions.ts` (`updateListing`) |
| VA-31 | `24deb1f` | **Filtro de la Home coordinado con `/planes`** (pedido del socio). El precio de la Home ahora se manda como `minPrice`/`maxPrice` (antes `price=0-100k`, que se ignoraba). En la barra de filtros: secciones con filtros activos abiertas, marcas aplicadas primero y desplegadas, etiquetas de los filtros aplicados que se quitan con ×, y el estado se rearma desde la URL en cada cambio. | Home → elegir marca y precio → Buscar. `components/ui/HomeFilter.tsx`, `components/ui/PlanesFiltersSidebar.tsx` |
| VA-23 | `7c6f4ab` | **Precios y estados legibles.** Todos los precios con el mismo formato ("US$ 180.500" / "AR$ …") vía `formatPrice`; el buscador del header ya no dice USD en repuestos en pesos. Estados con etiquetas ("Usado", "A reparar", "Pistón") también en el PDF y la card de repuesto. | Home (destacadas y últimas), `/planes`, `/spareparts`, buscador del header, PDF. `lib/format.ts`, `lib/constants.ts` |
| VA-24 | `254194f` | Horas en 0 visibles en el PDF del avión (antes la fila desaparecía); año de la card destacada con `!= null`. | PDF de un avión con motor en 0 h. `components/ui/AircraftPDF.tsx` |
| VA-25 | `1640ad2` | **Placeholder que existe** (`/placeholder.svg`) en los 15 lugares que usaban `/placeholder.png`; la card destacada muestra el placeholder si la foto no carga. | `/planes?brand=…` con el aviso "Mock 7" (foto de loremflickr caída). `PLACEHOLDER_IMAGE` en `lib/constants.ts` |
| VA-26 | `607bc3b` | Tipos de next-auth limpios y fuera `requireCompleteProfile` (iba a `/completar-perfil`, que no existe). | Sin cambio visible. `types/next-auth.d.ts`, `lib/auth-helpers.ts` |
| VA-28 | `ec0a4b6` | **Tildes y voseo**: "¿Querés vender tu aeronave?", "Publicar mi avión", "Pellizcá o usá la rueda…", "y más...", y mensajes de error en voseo ("Tenés que iniciar sesión…"). | Home (bloque "¿Querés vender…"), zoom de la galería, buscador, preguntas, cupones. 18 archivos |
| VA-29 | `d21ce1e` | Cinta "Próximamente" de `/services`: badge arriba del título en celular y tablet; cinta diagonal solo desde 1024 px. | http://localhost:3000/services a 375 px |

## Fase 4 — Lista del socio

| Tarea | Commit | Qué cambió | Dónde verlo |
|---|---|---|---|
| VA-43 | `d261f50` + `3e498ef` | Subcategorías **Monomotor/Bimotor → Pistón/Turbohélice** (MT y BT nuevas), S/C pasa a "Otros", el PC-12 pasa a MT y los 170 modelos tienen categoría por defecto (migración `20261008154932_va43_subcategorias`). En el formulario: "Tipo de aeronave" + "Motorización", que se completa solo al elegir el modelo. En el filtro de `/planes`, Monomotor y Bimotor tienen como hijos a Pistón y Turbohélice. Seed corregido. | `/publish` (paso 1) · `/planes` → Categoría · `lib/aircraft-categories.ts`, `prisma/seed-taxonomy.ts` |
| VA-54 | `1460fb8` | Campos nuevos (migración `20261008194327_va54_campos_nuevos`): **potencia del motor** (`horsepower`), **marca de la hélice** (`AircraftPropeller.brand`, antes iba pegada al modelo), **equipamiento adicional** (`extraEquipment`, un ítem por línea), **implementos agrícolas** (`agEquipment`, solo en Agrícola: se limpia al cambiar de categoría y el servidor lo descarta en otras) y **precio negociable** (`negotiable`). Están en el formulario de alta y edición, en el esquema Zod, en el servidor y en el PDF. Además: label "DURG / SMOH (hs desde última revisión general)", input "Horas del motor" (existía en la base pero no había dónde cargarlo), guía de fotos en el paso 3 y label "Habilitado hasta (vencimiento del anual)". | `/publish` pasos 1 a 3 · `components/ui/PublishForm.tsx`, `lib/listing-schema.ts`, `components/ui/AircraftPDF.tsx` |
| VA-57 | `553d45a` + `8b614da` | Rediseño del detalle según las maquetas de `docs/mockups/`: "Publicado el … · 📍 ubicación" en una línea; card "Características" con íconos, plegable, 2 columnas en desktop y 1 en celular (reemplaza los badges); "Información adicional" en tablas una debajo de la otra (General, Motor, Hélice, Aviónica, Equipamiento adicional con viñetas, Implementos agrícolas solo en Agrícola, Exterior, Interior), sin filas ni tablas vacías; "Motor 1/2" y "Hélice 1/2" solo con más de un motor. Mismo criterio en el repuesto (General con Categoría › Subcategoría, Compatibilidad, Atributos). Fuente única `lib/listing-detail.ts` para la web y la vista de impresión. Arreglos en el detalle de repuesto: el favorito, el PDF y "Reportar" usaban los de avión (el PDF daba "No encontrado") y los botones de contacto de escritorio registraban la analítica como AIRCRAFT. | Cualquier detalle de avión o repuesto · `components/ui/listing/`, `lib/listing-detail.ts`, `components/ui/PlaneActionsHeader.tsx` |
| VA-44 | `3e498ef` | Horas opcionales en Agrícola, Experimental y Proyecto; aviónica opcional en Agrícola y Proyecto; TBO opcional en Proyecto (migración `20261008155026_va44_campos_opcionales`). Labels con "(opcional)". "Habilitado" pasa a Sí/No obligatorio. "No informadas" en cards, detalle y PDF. | `/publish` con tipo Agrícola · detalle de un aviso sin horas · `lib/aircraft-rules.ts` |
| VA-58 | `0d59127` | **Miembros fundadores a mano desde el admin** (pedido del socio). El registro ya no los asigna solo. Nueva sección **Usuarios** en el panel: búsqueda, filtro "Solo fundadores", alta, método de ingreso (Email / Google), email sin verificar, cantidad de avisos y botón "Hacer fundador" / "Fundador · Quitar". Contador "Fundadores: X de 50" con tope. | http://localhost:3000/admin/users (con un usuario admin). `app/admin/users/page.tsx`, `app/actions/admin-users-actions.ts`, `components/ui/FoundingMemberToggle.tsx` |

### VA-57 · Verificación "campo del formulario → dónde se ve en el detalle"

Hecha con un script que compara cada campo cargado en la base con el HTML del detalle (5 avisos de prueba): **0 faltantes**.

**Avión**

| Campo del formulario | Dónde se ve en el detalle |
|---|---|
| Título | Encabezado (h1) y título de la pestaña |
| Año | General → Año (y resumen lateral) |
| Condición | General → Estado ("Nuevo"/"Usado") |
| Precio / Precio a consultar | Resumen lateral (US$ … o "Consultar precio") |
| Precio negociable, Financiación, Permuta, Alquiler | Características (Sí / "Posible alquiler") |
| Horas totales | General → Horas totales ("No informadas" si falta, por VA-44) |
| Marca / Marca personalizada | General → Marca |
| Modelo / Modelo personalizado | General → Modelo |
| Variante | General → Variante |
| Tipo de aeronave + Motorización | General → Categoría (ej. "Monomotor Pistón") |
| Aviónica: descripción | Aviónica / Equipamiento / Radio → Descripción |
| Apto IFR, Autopilot | Características |
| Equipamiento adicional | Tabla "Equipamiento adicional" (lista con viñetas) |
| Implementos agrícolas | Tabla "Implementos agrícolas" (solo Agrícola) |
| Motor: marca, modelo, potencia, horas, TBO, DURG/SMOH, descripción | Tabla "Motor" o "Motor 1/2" |
| Hélice: marca, modelo, horas, descripción | Tabla "Hélice" o "Hélice 1/2" |
| Fotos | Galería |
| Documentos | "Documentación Adjunta" |
| Habilitado (Sí/No) + fecha | Características: "Habilitado hasta: dd/mm/aaaa", "Habilitado: Sí" o, si no está habilitado pero tiene fecha, "Habilitación vencida el …" |
| Matrícula | **No se muestra a propósito**: D13 pendiente (el formulario dice que es interna) |
| Ciudad, Provincia | Línea "Publicado el … · 📍 Ciudad, Provincia" |
| Interior: descripción, pasajeros | Tabla "Interior" (pasajeros también en Características) |
| Aire acondicionado, Oxígeno | Características |
| Exterior: descripción | Tabla "Exterior" |
| Descripción general | "Descripción General" |
| (engineType, interno) | No se muestra aparte: lo dice la categoría |

**Repuesto**

| Campo del formulario | Dónde se ve en el detalle |
|---|---|
| Título | Encabezado |
| Marca | General → Marca |
| Precio / Moneda / A consultar | Resumen lateral y Características → Moneda |
| Estado | Características y General → Estado ("Recorrido", "A reparar", …) |
| Fotos | Galería |
| Ciudad, Provincia | Línea de fecha + ubicación |
| Descripción | "Descripción General" |
| Nº de parte | Características y General |
| Stock | Características y General |
| Categoría › Subcategoría › Sección | General → Categoría |
| Aeronaves compatibles | Tabla "Compatibilidad" (lista) |
| Atributos (JSON) | Tabla "Atributos" (hoy el formulario no los carga) |

**Avisos de prueba de VA-57** (en `va_dev`, usuario `test-va30-user`, fotos en el bucket real):

| Aviso | id | Para qué |
|---|---|---|
| Prueba VA-57 Monomotor completo (Aero Boero AB-115) | `cmuzynunm0000e4v756ndwzuo` | Todos los campos, 1 motor, 1 hélice, PDF adjunto |
| Prueba VA-57 Bimotor 2 motores (Baron 58) | `cmuzyohn60009e4v77hnxvgdu` | Motor 1/2 y Hélice 1/2 |
| Prueba VA-57 Agrícola con implementos (AT-802) | `cmuzyp86n000ie4v7r7660kk3` | Implementos agrícolas, no habilitado |
| Prueba VA-57 Monomotor mínimo (Cessna C-150) | `cmuzypluk000qe4v72jjlkg28` | Solo obligatorios: sin card de características ni tablas vacías |
| Prueba VA-57 Repuesto completo | `cmv04aysm00003ov7l1zup79o` | Todos los campos, ARS, Recorrido, 2 aeronaves compatibles |

Revisados a 375 y 1280 px. Los PDF (`/api/aircraft/<id>/pdf` y `/api/spareparts/<id>/pdf`) responden 200; falta mirarlos visualmente.

## Fase 5b — Rendimiento

| Tarea | Commit | Qué cambió | Dónde verlo |
|---|---|---|---|
| VA-70 | `43f3d48` | La Home ya no baja 25 MB de JS: los íconos de categorías son propios (`components/icons/category/`), sin `react-icons`. | `/` → "Buscar Repuestos por Categoría" |

## Bugs encontrados en el camino (fuera del plan)

| Commit | Qué cambió | Dónde verlo |
|---|---|---|
| `0de86fb` | Editar desde el perfil pisaba campos (condición, checks, descripción). *Después reemplazado por la edición completa de VA-30.* | — |
| `790eabd` | El perfil muestra los errores de renovar, borrar y editar. | Perfil |
| `5a7f84f` | **Al borrar un aviso, sus fotos y documentos quedaban en Supabase Storage.** Ahora se borran también. Nuevo `scripts/storage-orphans.mjs` para los huérfanos que ya existen (en producción hay 44, unos 23 MB). Por defecto solo informa; con `--delete` los borra. | Perfil → 🗑️ en un aviso · `app/actions/listing-actions.ts` |
| `005ba2a` | Error de hidratación por el formato de horas ("2600" vs "2.600"). | Home / `/planes`, sin aviso rojo de Next |

## Cambios fuera del código (no commiteados)

- `docs/PLAN_FIXES_MVP.md`: el plan (lo mantenés vos; le agregué el estado y los comandos de producción de VA-10).
- `.claude/launch.json`: config para levantar `npm run dev` desde Claude.
- `npm install`: instaló `@react-pdf/renderer`, que faltaba (el lockfile no cambió). `zod` pasó a ser dependencia directa (commit de VA-30).
- **Base local:** `va_dev` (copia de producción, ya con las migraciones de VA-43/44), y las descartables `va_shadow`, `va_empty` y `va_check` (ensayo de VA-43/44). El `.env` apunta a `va_dev` y las URLs de producción quedaron comentadas.
- **Backup:** `C:\Users\pc\Documents\backups-va\va_prod_public_2026-10-08.dump`.
- **Usuario de prueba de VA-20:** `delivered@resend.dev` (casilla de prueba de Resend), creado desde `/register` en `va_dev` y ya verificado. La contraseña se generó en el navegador y no se guardó: el sitio todavía no tiene "olvidé mi contraseña", así que para probar de nuevo conviene registrar otro usuario.
- **Datos de prueba de VA-30** (en `va_dev` y en el bucket real de Supabase):
  - Usuario `test-va30-user` (`prueba.va30@ventasaeronauticas.test`, sin contraseña).
  - Aviso de avión "Prueba VA-30 Cessna 182" con 10 fotos en `listings/aircraft/test-va30-user/`.
  - Aviso de repuesto "Prueba VA-30 repuesto": **ya borrado** (sirvió para probar el arreglo del Storage).
  - Aviso "Prueba VA-44 Agrícola sin horas" (AT-802), con 1 foto.
  - No los borré: podés eliminar los avisos desde la base local y los archivos desde el panel de Supabase.

## Estado del entorno local (para retomar)

- `npm run dev` con `.env` → `va_dev` (Postgres 17 local, servicio `postgresql-x64-17`; si está detenido, hay que iniciarlo como administrador). Migraciones aplicadas en `va_dev`: baseline, VA-43, VA-44, VA-54 y VA-11.
- **Después de cada migración: `npx prisma generate` y reiniciar `npm run dev`.** En Prisma 7, `migrate dev` no regenera el cliente.
- Sesión de prueba: usuario `test-va30-user`. La cookie `authjs.session-token` se genera con `node --env-file=.env <scratchpad>/test-session.mjs` (usa el `AUTH_SECRET` local). Si el navegador del panel se reinicia, hay que volver a ponerla.
- Producción (cuando se despliegue): `resolve --applied` de la baseline y después `npm run migrate:deploy`, que ahora aplica VA-43, VA-44, VA-54 y VA-11. Ver el plan, debajo de VA-10.

## Hallazgos pendientes (anotados, sin tocar)

- **`/plans` → `/checkout` da 404.** `/plans` está en el footer y en el sitemap; sus botones llevan a `/checkout`, que no existe. Es de la Fase 6 (Mercado Pago): decidir si se esconde `/plans` hasta entonces.
- **Código que no se usa** (para VA-61): `app/profile/[id]/profile-client.tsx` (con links a `/publicacion` y `/editar-publicacion`), `components/ui/HeroCarousel.tsx` (link a `/aviones`, que no existe), `components/ui/animated-search.tsx`, `lib/aircraft-service.ts`.
- **Quitar un admin** tarda hasta 5 minutos en aplicarse (VA-13: `isAdmin` se revalida cada 5 min en el `jwt`).
- **`lib/aircraft-service.ts`** no se importa en ningún lado (código muerto, para VA-61).
- **Favoritos** (`/favs`) puede seguir mostrando publicaciones vencidas que el usuario guardó; no estaba en VA-14. Decidir si se ocultan o se marcan como "no disponible".
- **Fundadores en producción:** hay 6 asignados automáticamente por el registro viejo, entre ellos cuentas de prueba (`augusto@gmail.com`, `delivered@resend.dev` en la copia local). Revisarlos en `/admin/users` cuando se despliegue VA-58.
- **Panel admin en celular:** la barra lateral fija de 256 px deja ~120 px de contenido a 375 px. Afecta a todo `/admin` (candidato para VA-60).
- **Vistas de anónimos:** con VA-17, un anónimo que abre la misma publicación en otra pestaña suma otra vista; se resuelve con la cookie `va_anon` de VA-15.
- **Producción:** antes de desplegar, hacer el `resolve` de la baseline y después `npm run migrate:deploy` (comandos en el plan, debajo de VA-10).
- **Huérfanos en Storage:** correr `scripts/storage-orphans.mjs` contra producción (primero sin `--delete`).
- Hay otro aviso de prueba de un PC-12 cargado como Helicóptero (H); no se tocó.
- Después de cada `prisma migrate` o `prisma generate`, reiniciá `npm run dev`: el servidor de desarrollo sigue usando el cliente de Prisma viejo, que tenía cargado en memoria, y falla con errores como "Argument `category` is missing".
- El banner "Ir a mi perfil" del detalle apunta a `/profile`, que no existe (la ruta es `/profile/<id>`).
- `/faq` tiene preguntas de ejemplo y apunta a `/bkg-faq.jpg`, pero el archivo en `public/` es `.png`.
- `favicon.ico` mide 148×256, no es cuadrado.
- Avatar y logo de marca todavía suben a través de la función (límite de 4,5 MB en Vercel).
- **No existe "olvidé mi contraseña"** para las cuentas con email y contraseña (no está en el plan; anotarlo como pendiente para el lanzamiento).
- El bucket `documents` es público aunque el formulario dice "Documentación (solo privado)".
- VA-54 ❓: unificar el label de `RECORRIDO` (hoy "Recorrido") con el que use el socio ("Overholeado" en la composición).
- VA-54: las hélices cargadas antes del 8/10 tienen la marca dentro de `model`.
- VA-41 (orden de bloques en celular) sigue pendiente: hoy la descripción va antes que las características.
