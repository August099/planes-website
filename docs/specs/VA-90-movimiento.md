# VA-90 · Movimiento: actividad reciente + avisos "Vendido"

> **Prioridad mobile:** todo esto tiene que verse y usarse con total comodidad en el celular. Diseñá primero para 375 px y después ampliá a desktop. Seguí `docs/DESIGN_GUIDELINES.md`.

## Parte A · Avisos "Vendido"

### Marcar como vendido
- En "Mis publicaciones", y en el detalle cuando lo ve su dueño, botón **"Marcar como vendido"** para aeronaves, repuestos y hangares. En hangares, el texto es "Marcar como alquilado/vendido".
- Al tocarlo, un panel simple (bottom sheet en mobile) pregunta **"¿Dónde lo vendiste?"**, con tres opciones: "Por Ventas Aeronáuticas", "Por otro medio" o "Prefiero no decir". Guardar la respuesta (`soldVia`) y la fecha (`soldAt`). Estado nuevo `SOLD` en el enum de estados, o el equivalente según el schema.
- Se puede deshacer durante 24 horas ("Me equivoqué, sigue a la venta").

### Qué ve el público
- El aviso queda visible **30 días** con un sello "Vendido". Si se vendió por la web, el sello dice "Vendido en N días", contando desde la publicación hasta `soldAt`.
- Se ocultan los datos de contacto, el botón de preguntar y el de comparar. Se muestra **el último precio publicado**, sin más datos.
- No aparece en los listados por defecto. Se puede ver con un filtro "Incluir vendidos" y sigue accesible por su URL.
- Después de 30 días se archiva: sale del público y queda en el historial del vendedor.

### Qué ve el vendedor al marcar vendido
- **Aviso sobre la renovación:** si el aviso se pagó por publicación (no está incluido en una suscripción), mostrar el mensaje "¡Felicitaciones! Ya no hace falta que renueves este aviso". Además, cancelar los recordatorios de vencimiento y renovación de ese aviso. Si el aviso está incluido en una suscripción, no mostrar el mensaje de renovación.
- **Cupón de recompensa:**
  - Mensaje "¿Tenés otra aeronave, repuestos o un hangar para publicar? Te regalamos un 25% de descuento en tu próxima publicación", con un botón **"Publicar ahora"**.
  - El cupón también llega por mail.

### Cupón fijo configurable
- En la sección **Cupones** del admin, un cupón de sistema "Recompensa por venta" (tipo fijo, no se borra), con:
  - un toggle Activo/Inactivo;
  - el porcentaje editable (por defecto 25%);
  - los días de validez (por defecto 90).
- Cuando está activo, cada vez que un usuario marca un aviso como vendido se le genera un **código personal de un solo uso**, asociado a su cuenta y con vencimiento.
- Si está inactivo, no se ofrece el cupón y el resto del flujo sigue igual.
- Que no se pueda abusar: como máximo un cupón por aviso vendido, y ninguno si el aviso se marca vendido dentro de las 48 horas de publicado (para evitar publicar y "vender" solo para conseguir cupones).

## Parte B · Actividad reciente (componente para la Home)

### Componente
`components/ui/ActivityTicker.tsx`, un componente independiente que se puede mover de lugar en `app/page.tsx` sin tocar nada más.

- **Ubicación inicial:** una franja fina justo debajo del hero.
- **Eventos (los cuatro tipos):**
  1. Nuevo aviso: aeronave, repuesto o hangar. Por ejemplo "Nuevo · Cessna 150 · Rosario, Santa Fe · hace 2 h".
  2. Vendido por la web. Por ejemplo "Vendido · Piper PA-11 · en 18 días".
  3. Baja de precio. Por ejemplo "Bajó de precio · Piper PA-28 · Córdoba". Requiere guardar el historial de precios: tabla `PriceChange` (o similar) que se registra cuando el vendedor baja el precio de un aviso activo.
  4. Nueva guía publicada.
- Cada evento es un link a su aviso o guía.
- **Solo datos reales**, de los últimos 7 días, sin repetir el mismo aviso.

### Umbral configurable
- El bloque se muestra solo si hay al menos **5 eventos en los últimos 7 días**. Si no, no se renderiza.
- El mínimo de eventos y los días se configuran desde el admin (una sección simple de "Ajustes de la Home" o similar).

### Diseño y comportamiento
- **Mobile:** una sola línea a la vez, que rota cada 4–5 segundos con una transición suave, más un botón chico para pausar. Altura baja, para no empujar el contenido. Texto legible (mínimo 14 px). Toda la línea es tappable con buen tamaño de toque.
- **Desktop:** cinta con desplazamiento lento continuo, que se pausa al pasar el mouse.
- Con `prefers-reduced-motion` no hay animación: se muestra una lista estática de 3 eventos.
- Los datos se traen en el servidor, con caché de unos 5 minutos. El JavaScript de cliente se limita a la rotación.

## Aceptación
- Marcar como vendido una aeronave, un repuesto y un hangar en va_dev, y probar las tres opciones de "¿Dónde lo vendiste?".
- El sello y los 30 días funcionan, y el contacto queda oculto.
- El mensaje de "no hace falta renovar" aparece solo en avisos pagos por publicación.
- El cupón se genera con el porcentaje configurado, es de un solo uso y se puede desactivar desde el admin.
- El ticker aparece solo con el umbral cumplido, rota bien en mobile y se puede mover de lugar en la Home cambiando una sola línea.
- Capturas a 375 px y a 1280 px.
