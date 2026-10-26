# VA-84 · Publicación de hangares (prioridad 2) + perfiles reorganizados

## Objetivo
Un tercer tipo de publicación, además de aeronaves y repuestos: **hangares**. Funciona igual que los otros dos: formulario de publicación, plan y precio propio, vencimiento, estados, favoritos, preguntas, denuncias, moderación en el admin y búsqueda. Vive dentro de Servicios.

Referencias tomadas de marketplaces de hangares de afuera: tarifas y medidas a la vista desde la tarjeta, filtro por medidas de puerta y distinción entre alquiler y venta.

## Qué se publica (todos los casos)
- `listingType`:
  - Alquiler de espacio en un hangar compartido.
  - Alquiler de hangar completo.
  - Venta de hangar.
- `spaceType`: hangar individual, hangar compartido o plataforma descubierta (opcional, para quien alquila lugar al aire libre).
- Cualquier usuario puede publicar (particulares, aeroclubes y empresas).

## Campos
- **Ubicación**:
  - Nombre del aeródromo o pista, código OACI/ANAC (opcional), localidad y provincia (las 24 canónicas de `lib/provinces.ts`).
  - Coordenadas, obtenidas con la API Georef a partir de la localidad, igual que en el mapa del detalle si ya existe.
  - `airfieldId` opcional y nulo por ahora, para asociarlo en el futuro al directorio de pistas. Es la misma idea que asociar un repuesto con una aeronave: si el directorio existe, se elige de una lista; si no, se escribe.
- **Medidas (en metros)**: ancho de puerta, alto de puerta, ancho interior, fondo interior y superficie total (m²). El ancho y el alto de la puerta son obligatorios, porque es lo primero que mira quien busca.
- **Capacidad**: cantidad de lugares disponibles y tipos de aeronave que entran (selección múltiple: monomotor, bimotor, helicóptero, jet liviano, planeador, ultraliviano).
- **Servicios** (checkboxes): electricidad, agua, baño, oficina o depósito, vigilancia o cámaras, acceso 24 h, combustible en la pista, taller en la pista, escuela de vuelo en la pista, pista iluminada.
- **Precio**:
  - Monto, moneda (ARS/USD) y período: por noche, por día, mensual o anual en alquiler; precio total en venta.
  - Opción "a convenir" y opción "negociable", igual que en aeronaves.
- **Disponibilidad**: "Disponible desde" (fecha) o "Disponible ahora".
- **Fotos** (mismas reglas y compresión que en aeronaves) y **descripción**.

## Rutas (en inglés, dentro de Servicios)
- Listado: `/services/hangars`, con filtros:
  - tipo de publicación
  - provincia (usar `?province=` como en VA-77)
  - ancho mínimo de puerta
  - tipo de aeronave
  - rango de precio
  - servicios
- Detalle: `/services/hangars/hangar-details/[id]`, con el mismo esqueleto que el detalle de aeronave: galería, datos en grilla, mapa de zona aproximada si existe el componente, preguntas, vendedor y botones.
- Publicar: tercera pestaña "Hangar" en `/publish`, con el mismo estilo de pasos que aeronave y repuesto.
- En `/services` (página de servicios), sumar "Hangares" a "Disponible ahora", junto a Guías.

## Cobro (precio propio)
- Extender `PlanType` con `HANGAR_PACK` y `Plan` con `hangarListingsCount` e `isUnlimitedHangars`, o el equivalente según cómo esté resuelto hoy el pricing por publicación en el admin. Seguí el mismo patrón que aeronaves y repuestos.
- Precios configurables desde el admin, en la misma sección donde se definen los precios de publicaciones.
- Vencimiento (`listingExpiresAt`) y estados idénticos a aeronaves.
- Cupones aplicables, igual que hoy.
- Migración con `prisma migrate dev`.

## PDF del hangar
- Botón "Descargar PDF" en el detalle, con QR y la estructura definida en `docs/specs/VA-87-pdfs-qr-y-logos.md` (sección "PDF de hangares").

## Integraciones con lo existente
- Favoritos, preguntas, denuncias, moderación en el admin y búsqueda global del header (agregar los hangares a los resultados).
- Sitemap y JSON-LD (Product u Offer, o el tipo más adecuado).
- El proceso de vencimiento que ya exista para los otros avisos aplica también a los hangares.

## Perfiles reorganizados (incluido en esta tarea)
- Perfil público y "Mis publicaciones": pestañas **Aeronaves / Repuestos / Hangares**, cada una con su contador. Se ocultan las pestañas sin publicaciones en el perfil público, pero no en el panel propio.
- **Las tarjetas son las mismas que en los listados** (`/planes`, `/spareparts`, `/services/hangars`), sin variantes propias del perfil.
- Grilla, orden y paginación iguales a los listados.
- En el panel propio, sobre cada tarjeta, las acciones de siempre (editar, pausar, renovar), sin cambiar la tarjeta base.
- La tarjeta de hangar nueva sigue el mismo diseño que las de aeronave y repuesto, mostrando:
  - foto
  - tipo de publicación
  - aeródromo y localidad
  - medidas de puerta (por ejemplo "Puerta 12 × 3,5 m")
  - precio con su período

## Aceptación
- Publicar un hangar de cada tipo en va_dev, verlo en el listado con filtros, en el detalle, en favoritos, en la búsqueda del header y en el perfil.
- Vence igual que un avión.
- El precio se toma de lo configurado en el admin.
- Los perfiles muestran las tres pestañas con las mismas tarjetas que los listados.
- Capturas a 375 px y a 1280 px del formulario, el listado, el detalle y el perfil.
