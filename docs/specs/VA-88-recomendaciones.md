# VA-88 · Recomendaciones al pie de los detalles (aeronaves, repuestos y hangares)

> **Orden:** después de VA-83 (mapa + comparador) y de VA-84 (hangares). Reutiliza las coordenadas de la Parte 0 de VA-83 y el bloque "Comparar con similares".

## Reglas generales
- Centralizar la lógica en `lib/recommendations.ts`, con una función por tipo de aviso. Server components, sin JS de cliente extra salvo el carrusel.
- Solo avisos visibles (mismo criterio que los listados: activos y no vencidos). Nunca el aviso actual. Como máximo 2 avisos del mismo vendedor por bloque, para que no parezca su catálogo.
- **Las tarjetas son las mismas que en los listados.**
- Desktop: grilla de 4. Mobile: carrusel horizontal con scroll-snap, sin scroll horizontal de la página.
- **Siempre se completa por niveles (cascada)**: si el criterio más preciso devuelve pocos resultados, se completa con el siguiente nivel hasta llegar a 8 (o 4 en mobile visible). Si al final hay menos de 2, el bloque no se muestra.
- El título del bloque refleja honestamente el criterio que se usó (ver los títulos de cada caso). No decir "compatibles" si no lo son.
- Cachear los resultados unos 10 minutos (con el mismo mecanismo de caché del resto del sitio, si VA-71 está hecho).
- Ubicación: abajo de todo en cada detalle, antes del footer y después de las preguntas.

## 1. Detalle de aeronave → "Aeronaves similares"
- Reutilizar y unificar el bloque "Comparar con similares" de VA-83. Pasa a llamarse **"Aeronaves similares"** y va al pie. Cada tarjeta suma el botón "Comparar" del comparador, y el bloque tiene un botón "Comparar estas aeronaves" que arma la comparación con la actual y 2 similares.
- Puntaje de similitud:
  - Misma categoría: obligatorio en el primer nivel.
  - Misma marca: suma.
  - Mismo modelo: suma más.
  - Precio dentro de ±30%: suma, comparando solo avisos en la misma moneda.
  - Año dentro de ±10 años: suma.
  - Misma provincia: suma poco.
- Cascada:
  1. Misma categoría con buen puntaje.
  2. Misma categoría, cualquier precio.
  3. Categorías vecinas (por ejemplo Monomotor ↔ Avión ligero).
  4. Las más recientes.
- Extra: si existen repuestos asociados a la marca o modelo de esta aeronave, mostrar un segundo bloque **"Repuestos para <Marca Modelo>"**. Se oculta si hay menos de 2.

## 2. Detalle de repuesto
La compatibilidad real (qué repuesto sirve para qué aeronave) casi no va a estar cargada al principio. Solución por niveles, con títulos honestos:
- **Bloque A: "Repuestos similares"**
  1. Misma subcategoría específica.
  2. Misma subcategoría.
  3. Misma categoría principal.
  4. Si el título o el P/N comparten palabras clave relevantes con otros repuestos (por ejemplo "magneto", "Slick", "O-320"), completar con esos. Búsqueda de texto simple sobre título y P/N, ignorando palabras vacías.
- **Bloque B: aeronaves relacionadas**
  - Si el repuesto tiene una aeronave asociada (marca/modelo) → **"Aeronaves <Marca Modelo> en venta"**: avisos de aeronaves de ese mismo modelo, y si no hay, de esa marca.
  - Si no tiene aeronave asociada, pero el título o la descripción mencionan una marca o modelo existente en la base (coincidencia con los nombres de `AircraftBrand`/`AircraftModel`) → **"Aeronaves <Marca> en venta"**.
  - Si no hay ninguna de las dos señales, el bloque B no se muestra.
- **Para que la compatibilidad mejore con el tiempo:**
  - En el formulario de publicación de repuestos, dejar más visible el campo de aeronave asociada, con el texto "¿Para qué aeronave es? Así aparece recomendado en los avisos de ese modelo".
  - Si hoy solo admite una, evaluar permitir varias marcas/modelos (relación muchos a muchos) y proponerlo antes de cambiar el schema.

## 3. Detalle de hangar → cercanía
Usar las coordenadas del hangar y de los avisos (VA-83, Parte 0). Calcular la distancia con la fórmula de haversine, prefiltrando por una caja de latitud/longitud en la consulta, para no traer toda la base.
- **"Aeronaves cerca de este hangar"**: las aeronaves más cercanas, ordenadas por distancia, mostrando la distancia en la tarjeta ("a 35 km").
- **"Repuestos en la zona"**: los repuestos más cercanos.
- **"Otros hangares cerca"**: los hangares más cercanos.
- Cascada por radio: 50 km → 150 km → 400 km → misma provincia → más recientes del país. El título se ajusta si se salió de la zona ("Aeronaves en <Provincia>" o "Aeronaves publicadas recientemente").
- Si el hangar no tiene coordenadas, usar la misma provincia.
- Extra: en los detalles de aeronave y de repuesto, un bloque chico **"Hangares disponibles cerca"** con hasta 4 hangares a menos de 150 km. Se oculta si no hay.

## Aceptación
- En va_dev, con datos de prueba variados, mostrar capturas de:
  - el detalle de un avión con similares de su categoría;
  - un repuesto con similares y con aeronaves de su modelo asociado;
  - un repuesto sin aeronave asociada (bloque B oculto o inferido por texto);
  - un hangar con recomendaciones por distancia;
  - un caso con pocos datos, donde se vea la cascada y que el título cambia.
- Ningún bloque muestra el aviso actual ni avisos vencidos.
- Sin scroll horizontal a 375 px.
