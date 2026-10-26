# VA-86 · Foro de la comunidad (prioridad baja: hacer después de VA-83, VA-84 y VA-85)

## Definición acordada
- **Propósito**: consultas técnicas y charla de comunidad, separadas por categorías.
- **Lectura libre** (sin cuenta, indexable). **Escribir** requiere sesión y email verificado.
- **Identidad**:
  - En el foro se muestra el **username**. Si no existe, agregar `username` único a User y pedirlo la primera vez que alguien escribe (validar formato y palabras prohibidas).
  - Los usuarios con **página personalizada** (`hasCustomPage`) muestran su insignia junto al username.
- **Sin fotos** en esta etapa.
- **Funciones**:
  - Crear tema, responder.
  - El autor del tema puede **marcar una respuesta como solución**, que se muestra destacada arriba.
  - **Mail al recibir una respuesta** en un tema propio, vía Resend, con link para desactivarlo.
- **Avisos y autopromoción**: prohibidos. Si el texto parece un aviso de venta, mostrar el mensaje "Para vender, publicá un aviso" con un botón a `/publish`. Los moderadores pueden mover o borrar.
- **Moderación desde el admin**:
  - Listado de reportes.
  - Ocultar o borrar temas y respuestas.
  - Cerrar temas.
  - Bloquear a un usuario del foro.
- **Filtros automáticos**:
  - **Links**: permitidos los dominios de una lista editable en el admin (por ejemplo argentina.gob.ar, anac.gob.ar, faa.gov, easa.europa.eu, youtube.com, wikipedia.org y sitios de fabricantes). Un link a otro dominio deja el mensaje "en revisión" hasta que el admin lo apruebe.
  - **Palabras**: lista negra editable en el admin. El mensaje que la contiene se bloquea o queda en revisión.
  - **Límite de frecuencia**: por ejemplo, un máximo de N mensajes por hora por usuario nuevo.
  - **Botón "Reportar"** en cada mensaje.
- **Categorías iniciales**, editables desde el admin (crear, renombrar, reordenar, ocultar), con el mismo estilo que las otras secciones del admin:
  1. Mantenimiento y motores
  2. Aviónica e instrumentos
  3. Trámites y ANAC
  4. Vuelo e instrucción
  5. Aviación agrícola
  6. Helicópteros
  7. Planeadores y ultralivianos
  8. Compra y venta: consejos (no avisos)
  9. Eventos y encuentros
  10. Café de hangar (charla general)

## Rutas
- `/services/forum`: categorías con su cantidad de temas y la última actividad.
- `/services/forum/[categorySlug]`: lista de temas.
- `/services/forum/[categorySlug]/[topicSlug]`: el tema con sus respuestas.
- JSON-LD `DiscussionForumPosting` y, cuando hay solución, `QAPage`.
- En `/services`, la tarjeta "Foro de la comunidad" pasa a "Disponible ahora".

## Siembra
Antes de abrir, cargar entre 15 y 20 temas iniciales publicados por la cuenta oficial "Ventas Aeronáuticas", con preguntas frecuentes reales y una primera respuesta útil que linkee a las guías cuando corresponda. Claude prepara los textos aparte. No inventar experiencias personales.

## Aceptación
- Leer sin cuenta.
- Escribir solo con email verificado.
- Marcar solución.
- Llega el mail de respuesta.
- Un link raro queda en revisión.
- Una palabra prohibida se bloquea.
- El admin modera y edita categorías.
