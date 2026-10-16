# VA-83 · Mapa en el detalle + Comparador de aeronaves (prioridad 1)

> **Orden:** primero la Parte 0 (mapa). Cuando esté terminada y verificada, seguí con el comparador.

## Parte 0 · Mapa de zona en el detalle (hacer primero)

### Coordenadas
- Agregar `latitude` y `longitude` (Float, opcionales) a `Aircraft` y `SparePart`. Migración con `prisma migrate dev`.
- Geocodificar con la **API Georef** del gobierno argentino (`apis.datos.gob.ar/georef`, endpoint de localidades, con filtro por provincia, tomando el centroide). Leé su documentación antes de usarla.
- Usar la provincia canónica de `lib/provinces.ts` (VA-77) para que la búsqueda no falle.
- Se geocodifica **en el servidor al crear o editar un aviso** (solo si cambió la ciudad o la provincia) y se guarda. Nunca en cada visita.
- Si la API no responde o no encuentra la localidad, el aviso se guarda igual, sin coordenadas, y se registra el caso.
- Script `scripts/geocode-listings.ts` para completar los avisos existentes: dry-run por defecto, `--apply` para escribir, con pausa entre pedidos. Correrlo en va_dev y mostrarme cuántos quedaron sin resolver.

### Componente
- `components/ui/ListingLocationMap.tsx`, con Leaflet como librería de mapas.
- Se carga con import dinámico (`ssr: false`) **solo cuando el bloque entra en pantalla** (IntersectionObserver), para no sumar peso inicial al detalle. Mientras tanto, un placeholder del mismo tamaño, para que no salte el layout.
- Teselas: usar un proveedor apto para producción con plan gratuito (por ejemplo CARTO basemaps, MapTiler o Stadia), con la atribución visible que exija. No usar directamente los servidores de tiles de openstreetmap.org, cuya política no permite uso intensivo.
- Se muestra un **círculo de zona aproximada** (radio de unos 5 km) en rojo de marca semitransparente, sin marcador exacto, y un texto debajo: "Ubicación aproximada: <Ciudad>, <Provincia>".
- Zoom inicial que muestre la ciudad y alrededores. Sin scroll-zoom con la rueda (que no secuestre el scroll de la página). Controles de zoom visibles.
- Ubicación en la página: en el detalle de aeronave y de repuesto, en la columna del vendedor o debajo de la ficha técnica, según quede mejor con el diseño de VA-57. Altura contenida: unos 220 px en mobile y 260 px en desktop.
- Si el aviso no tiene coordenadas, el bloque no se muestra.
- El componente tiene que quedar reutilizable para hangares (VA-84) y el futuro directorio de pistas.

### Aceptación (Parte 0)
- Los avisos nuevos y editados guardan coordenadas.
- El script completa los existentes.
- El mapa aparece con el círculo en la ciudad correcta en al menos 5 avisos de provincias distintas.
- No carga nada del mapa hasta que se hace scroll hasta él (verificar en la pestaña Network).
- La atribución de las teselas es visible.
- Sin scroll horizontal a 375 px.

---

## Objetivo del comparador
Una página para comparar hasta 3 aeronaves una al lado de la otra, con TODOS sus datos, y una forma cómoda de elegirlas desde cualquier parte de la web.

## Cómo se eligen (selección)
1. **Botón "Comparar"** en cada tarjeta de aeronave (AircraftCard y OverlayAircraftCard) y en el detalle de la aeronave. Es un ícono chico con texto ("Comparar" / "Agregado"), que no compite con favoritos.
2. **Bandeja de comparación**: barra fija abajo de la pantalla que aparece al agregar la primera aeronave.
   - Muestra hasta 3 miniaturas (foto + título corto), cada una con una "x" para quitarla, y el botón "Comparar (n)", activo desde 2.
   - En mobile: barra compacta con "n de 3 · Comparar" y las miniaturas en un desplegable.
   - Si se intenta agregar una cuarta aeronave: aviso "Podés comparar hasta 3. Quitá una para agregar otra."
3. **Persistencia**: la selección se guarda en localStorage (con try/catch) para que sobreviva a la navegación. La página de comparación usa la URL `/planes/compare?ids=a,b,c`, así se puede compartir.
4. **Dentro de la página**: los lugares vacíos muestran "+ Agregar aeronave", con un buscador (por título, marca o modelo, solo avisos activos) para completar sin salir.
5. **Atajo de contexto**: en el detalle de una aeronave, un bloque "Comparar con similares" que sugiere 2 aeronaves de la misma categoría y un rango de precio parecido, con un botón que arma la comparación directo.

## Página `/planes/compare`
- **Encabezado de cada columna** (fijo arriba al hacer scroll): foto, título, precio, ubicación, botones "Ver aviso" y "Quitar".
- **Filas agrupadas por secciones**, en el mismo orden y con las mismas etiquetas que el detalle rediseñado (VA-57): Características, General, Motor, Hélice, Aviónica, Equipamiento, Exterior, Interior, Implementos agrícolas (solo si alguna es agrícola), Documentación, Condiciones de venta (financiación, permuta, alquiler, negociable).
- **Una sola fuente de verdad para los campos**: extraer la lista de campos y etiquetas del detalle a un archivo compartido (por ejemplo `lib/aircraft-fields.ts`), usado por el detalle y por el comparador. Así cualquier campo nuevo aparece en los dos lugares. Ningún campo del formulario de publicación puede quedar afuera.
- **Bimotores**: los datos de motor y hélice se muestran como "Motor 1 / Motor 2" dentro de la misma celda.
- **Campos vacíos**: un guion "—" en gris.
- **Toggle "Mostrar solo diferencias"**: oculta las filas en las que todas las aeronaves tienen el mismo valor.
- **Destacados**: en filas objetivas, marcar el mejor valor con un acento sutil (texto en negrita y un punto rojo, no fondos de color). Por ejemplo menor precio, menos horas desde la última recorrida (SMOH), menos horas totales y año más nuevo. No marcar "mejor" en filas subjetivas.
- **Moneda**: si los precios están en monedas distintas, mostrarlos tal cual, sin convertir.
- **Aviso inactivo** (vendido, vencido o pausado): la columna muestra "Este aviso ya no está disponible" y se puede quitar.

## Responsive
- Desktop: 3 columnas de datos más la columna de etiquetas.
- Mobile (375 px): la columna de etiquetas queda fija a la izquierda y las columnas de aeronaves se desplazan horizontalmente, de unos 160 px cada una, con scroll-snap. Encabezado de columnas fijo arriba. Que no haya scroll horizontal de la página, solo dentro de la tabla.

## Técnica
- Server component para traer los datos (solo avisos visibles con el mismo criterio que `/planes`) y client components chicos para la bandeja y el toggle.
- `noindex` en `/planes/compare`, porque tiene combinaciones infinitas.
- Sin dependencias nuevas.
- Seguir `docs/DESIGN_GUIDELINES.md`.

## Aceptación
- Agregar desde tarjetas y desde el detalle, ver la bandeja, comparar 2 y 3 aeronaves, quitar, usar el buscador para completar y compartir la URL en otra pestaña.
- El listado de filas cubre todos los campos que muestra el detalle (verificar con una aeronave con todos los campos cargados y con un bimotor).
- "Mostrar solo diferencias" funciona.
- Capturas a 375 px y a 1280 px.
