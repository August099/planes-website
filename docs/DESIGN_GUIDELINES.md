# Pautas de diseño · Ventas Aeronáuticas

La web tiene que parecer hecha por un estudio que conoce la aviación, no generada con una plantilla. Antes de entregar UI, revisá esta lista. Si usás alguno de los recursos "a evitar", justificalo en el informe.

## Identidad (de dónde sacar ideas)
- El mundo aeronáutico real: paneles de instrumentos, matrículas LV-XXX, marcas de pista, cartas de navegación, placas y rótulos técnicos, fichas de mantenimiento.
- Marca: azul #001F58, rojo #E70F1F y el motivo "//" del logo. El rojo es un acento escaso, no un relleno.
- Las fotos de aeronaves son el contenido principal: darles tamaño y protagonismo antes que a íconos o ilustraciones.
- Datos técnicos (año, TT, SMOH, ubicación, precio) con jerarquía clara y números legibles (tabular-nums). Es un mercado de gente que compara fichas.

## A evitar (recursos típicos de UI generada)
- Tarjetas de vidrio (backdrop-blur + bg-white/70) en todos lados.
- Grillas de 3 tarjetas iguales con un ícono dentro de un cuadradito de color, título y dos líneas de texto, repetidas sección tras sección.
- Texto con degradé (bg-clip-text) en títulos.
- rounded-2xl/3xl en absolutamente todo, y sombras grandes (shadow-xl/2xl) como recurso por defecto.
- hover:-translate-y y "elevación" en cada tarjeta.
- Todo centrado. Usar alineación a la izquierda como norma; centrar solo cuando tenga motivo.
- Emojis y cohetes, chispas o íconos decorativos en títulos.
- Blobs o resplandores de colores sin relación con la marca.
- Badges "Nuevo"/"Próximamente" con cintas diagonales.
- Copy genérico: "Todo en un solo lugar", "Descubrí", "Potenciá", "La mejor experiencia". Escribir como habla alguien del rubro, concreto y con voseo.
- Animaciones de entrada (fade-in/slide-up) en cada sección.

## A hacer
- Variar los recursos según la sección: no todas las secciones son "título centrado + grilla de tarjetas". Alternar listas, tablas, layouts asimétricos, una imagen grande con texto al costado, franjas.
- Radios de borde contenidos y consistentes: rounded-md/lg por defecto; más redondeado solo en piezas puntuales.
- Separar con espacio, líneas finas y tipografía antes que con cajas y sombras.
- Jerarquía tipográfica marcada: pocos tamaños, pesos bien diferenciados y un tratamiento propio para etiquetas técnicas (por ejemplo versalitas o mayúsculas pequeñas con tracking, como los rótulos de un panel).
- Íconos solo cuando ayudan a leer más rápido, con el mismo trazo y tamaño en toda la web.
- Microdetalles propios de la marca: el "//" como separador o acento, formatos de matrícula o código, bordes tipo "placa".

## Proceso
- Si existe la skill frontend-design (o similar de diseño), cargala antes de diseñar.
- Para cambios visuales grandes, proponé primero 2 direcciones distintas, cada una con una captura o descripción breve, y esperá la elección antes de implementar.
- Al terminar, sacá capturas a 375 px y a 1280 px y hacé una autocrítica contra la lista "A evitar": qué recursos quedaron y por qué.

---

## Referencia para páginas nuevas (actualizada el 11/10/2026)

Lo que ya está en el sitio y conviene reusar en vez de inventar de nuevo. Si una página nueva necesita algo que no está acá, sumarlo a esta sección.

### Tokens
| Uso | Valor |
|---|---|
| Azul de marca (títulos, texto fuerte, botón principal) | `#001F58` · hover `#00133A` |
| Rojo de marca (CTA, acento, alertas) | `#E70F1F` · hover `#C20D1A` |
| Rojo claro sobre fondos oscuros (para que se lea) | `#FF5A64` |
| Footer y zona oscura de la Home | `#001331` |
| Celeste de la Home (zona 1, VA-79) | `#CFE3F6` |
| Bordes finos | `border-[#001F58]/10` a `/15` (líneas internas `/10`, contorno `/12`) |
| Texto secundario | `text-slate-600`; rótulos y ayudas `text-slate-500` |
| Títulos | Montserrat (`font-heading`, `--font-display`) |
| Cuerpo | IBM Plex Sans (`font-sans`, `--font-body`) |

No sumar verdes, violetas ni otros colores de relleno: el verde quedó solo para confirmaciones puntuales (mensajes de "guardado"). El rojo nunca como fondo de una sección entera.

### Patrones
- **Rótulo técnico** (el "eyebrow" de paneles, columnas de tabla, datos de ficha): `text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500`. Va encima del título o del dato, nunca como pill con ícono.
- **Placa** (bloque de datos, paneles del admin, resumen de un pedido): `rounded-lg border border-[#001F58]/12 bg-white`, sin sombra o con `shadow-sm` como mucho. Dentro, filas separadas con `divide-y divide-[#001F58]/10` y `px-4/5 py-3`.
- **Ficha de datos** (`<dl>`): rótulo a la izquierda en `text-slate-500` y valor a la derecha o debajo en `font-medium`. Números con `tabular-nums`.
- **Precios:** siempre con `formatPrice` (`lib/format.ts`): `US$ 180.500` o `AR$ 30.000`. Precio 0 = "Gratis". Nunca "$ARS", "USD $" ni "ARS" al final.
- **Botones:** principal azul `rounded-md bg-[#001F58] text-white` (acciones de formulario y admin); CTA rojo `bg-[#E70F1F]` solo para la acción que el negocio quiere (publicar, contactar, pagar); secundario con borde `border-[#001F58]/20`. Alto mínimo 40–44 px en lo táctil. Sin emojis en el texto.
- **Diálogos:** `components/ui/ConfirmDialog.tsx` (`<dialog>` nativo: foco atrapado, Escape, fondo `#001331/60`). Para acciones grandes o irreversibles, pedir escribir una palabra (`requireText="CONFIRMAR"` / `"ELIMINAR"`). Antes → después → variación en una placa de 3 columnas (ver `/admin/prices` y `/admin/plans/[id]`).
- **Avisos dentro de un texto:** borde izquierdo de 2 px (`border-l-2 border-[#E70F1F] pl-3`) en vez de una caja de color.
- **Estados:** etiqueta chica `rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]` (activo en azul lleno, inactivo con borde, archivado gris).
- **Tablas comparativas** (comparador): etiquetas en una columna fija a la izquierda, encabezado fijo arriba, "—" gris en vacíos, el mejor valor en negrita con un punto rojo (nunca con fondo de color) y solo en filas objetivas.
- **Menú desplegable del header:** panel blanco a todo el ancho, columnas con su título en azul, ítems numerados en rojo cuando son una serie, sin íconos decorativos, y un link "Ver todas …" al pie de cada columna.
- **Tablas del admin:** contenedor `overflow-x-auto rounded-lg border bg-white`, encabezado con el rótulo técnico, filas `divide-y divide-slate-100`, números a la derecha con `tabular-nums`.
- **Formularios:** etiqueta `text-xs font-semibold text-slate-600` arriba del campo, campo `rounded-md border-slate-300 px-3 py-2 text-sm`, error `text-xs text-red-700` debajo. Las reglas en un esquema `zod` compartido entre el formulario y la action (ver `lib/plan-rules.ts`, `lib/listing-schema.ts`). Agrupar en bloques con su rótulo ("Lo que usa el sistema" / "Lo que se ve en /plans").
- **Layout de página de contenido:** título alineado a la izquierda; asimétrico en escritorio (`md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]`: contenido + placa lateral) y una sola columna en celular. Ver `/checkout`, `/services`, perfil con página personalizada.

### Componentes para reusar
| Necesito… | Usar |
|---|---|
| Ruta de navegación (con JSON-LD) | `components/ui/Breadcrumbs.tsx` (admin: `AdminBreadcrumbs`) |
| Fondo estándar de página | `components/ui/PageBackground.tsx` + `lib/page-backgrounds.ts` |
| Título de sección de la Home | `components/ui/home/SectionTitle.tsx` |
| Flechas de carrusel | `components/ui/home/CarouselArrow.tsx` |
| Barras "//" de marca | `components/ui/BrandSlashes.tsx` |
| Índice numerado (guías) | `components/ui/guides/GuideIndex.tsx` |
| Foto de un aviso | `components/ui/AppImage.tsx` (placeholder si la foto no carga; siempre con `sizes`) |
| Confirmar una acción | `components/ui/ConfirmDialog.tsx` |
| Compartir | `components/ui/ShareDialog.tsx` |
| Provincia | `components/ui/ProvinceSelect.tsx` (las 24 de `lib/provinces.ts`) |
| Mapa de zona aproximada | `components/ui/ListingLocationMap.tsx` (Leaflet al entrar en pantalla, círculo de ~5 km) |
| Datos de una aeronave (etiquetas y secciones) | `lib/aircraft-fields.ts` (la misma lista en detalle, comparador y PDF) |
| Comparar aeronaves | `components/ui/compare/CompareButton.tsx` y la bandeja `CompareTray` |
| Menú de Servicios (sumar una sección) | `SERVICE_SECTIONS` en `components/ui/ServicesMenu.tsx` |

### Rendimiento (para que una página nueva no lo empeore)
- Páginas públicas **estáticas** siempre que se pueda: no leer la sesión en el servidor; lo del usuario se pide desde el navegador (ver `FavoriteIdsProvider` y `HeaderUser`). Datos de la base con `unstable_cache` + tag y `updateTag`/`revalidatePath` en la action que los cambia.
- Librerías pesadas (Swiper, menús, mapas, PDF) con `next/dynamic` y montadas recién cuando el usuario las necesita (ver `CardImageSwiper`, `HeaderMenus`).
- Imágenes con `next/image`/`AppImage` y `sizes` reales; `priority` solo para la imagen principal de la pantalla.
- Antes de cerrar: 375 y 1280 px sin scroll horizontal, un solo `h1`, consola limpia (ver el repaso del 11/10 en `docs/REGISTRO_DE_CAMBIOS.md`).

### Páginas que todavía usan el estilo viejo (pendientes de alinear)
Repaso del 11/10/2026. Cada una necesita proponer 2 direcciones antes de tocarla (cambio visual grande):
- **`/plans`** y **`/ads`**: pill con ícono + título centrado en mayúsculas + 3 tarjetas iguales con la del medio agrandada (`scale-105`, `shadow-2xl`), "MÁS ELEGIDO" en pill, íconos en cuadraditos (en `/ads`). Idea: tabla comparativa tipo ficha técnica (columnas = planes, filas = qué incluye) con el precio arriba y el plan destacado marcado con el rojo en el borde, no agrandado.
- **`/howtopublish`**: 4 tarjetas con ícono en cuadradito, `rounded-2xl` y `shadow-xl`. Idea: la misma ruta de waypoints numerados de "Cómo funciona" de la Home (VA-82).
- **`/banners`**: formulario con `rounded-xl`, rótulos en mayúsculas grandes y el resumen centrado. Idea: el layout de `/checkout` (formulario + placa "Elegiste" al costado).
- **`/login`** y **`/register`**: título centrado en mayúsculas dentro de una tarjeta translúcida. Menor: alcanza con alinear a la izquierda y sacar el vidrio.
- **`/faq`**: el diseño está bien (índice + lista), pero el **contenido es de relleno** ("Pregunta 1 / Respuesta 1"): falta el texto real.
