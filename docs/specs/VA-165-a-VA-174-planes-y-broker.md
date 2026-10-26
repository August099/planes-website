# VA-165 a VA-174 · Planes según la grilla de los socios, cuenta Broker y categoría recomendada (19/10)

> **Ajusta lo hecho en VA-152 y VA-153** (ya están en local, y VA-153 en producción). Va en el MVP, **antes de VA-164** (la migración a producción). Orden = prioridad.
> **Reglas de siempre:**
> - Una tarea = un commit.
> - Nunca `db push`. Migraciones con `migrate dev`, mostrando el SQL y esperando mi OK.
> - Los datos financieros no se borran.
> - No tocar `.env` y nunca pedir credenciales.
> - Avisarme cuando haya algo para probar en el Preview, con los pasos.
> - Actualizar el plan, el registro y el checklist al cerrar cada tarea.

---

## La grilla de planes (fuente: documento "Composición de VA", 19/10)

| | **Base** (gratis) | **Pro** | **Broker / Empresa** |
|---|---|---|---|
| Precio real (mensual) | — | **$38.000** | **$55.000** un rubro ilimitado · **$85.000** ambos |
| Precio tachado (solo marketing) | — | $50.000 | $68.000 · $108.000 |
| Publicaciones de aeronaves activas | 1 | 3 | Sin límite* |
| Publicaciones de repuestos activas | 3 | 10 | Sin límite* |
| Máx. publicaciones al mismo tiempo | 4 | 13 | Sin límite* |
| Republicaciones | 2 por año | 5 por año | Todas, cada 30 días |
| Métricas de las publicaciones | ✓ (básicas) | ✓ (algunas) | ✓ (completas) |
| Edición libre de publicaciones | ✓ | ✓ | ✓ |
| Contacto del vendedor | ✓ | ✓ | ✓ |
| Usuario verificado | ✗ | ✓ | ✓ |
| Publicaciones destacadas | ✗ | ✓ | ✓ |
| Branding | ✗ | Banner en el perfil (la Página VA actual) | ✓ Página VA completa y detalles personalizados |

\* **Broker personalizable:** elige **aviones ilimitados** ($55.000), **repuestos ilimitados** ($55.000) o **ambos** ($85.000). **Lo que no elige como ilimitado tiene el cupo de Base** (por ejemplo, repuestos ilimitados + 1 avión).

**Decisiones de los socios (19/10):**
- **Cupo:** activas a la vez, por tipo. El máximo es la suma. Pausar, vender o tener el aviso moderado libera el lugar (como ya hace VA-152).
- **Año de las republicaciones:** 12 meses desde el alta de la cuenta (Base) o de la suscripción (Pro). Se reponen y no se acumulan.
- **Precio:** el de "promo" es el que se cobra, siempre y sin fecha, con la etiqueta "Promo de lanzamiento". El tachado es solo para mostrar. Los dos se editan en el admin.
- **Usuario verificado:** automático mientras el plan Pro o Broker esté vigente.
- **Destacadas:** ver VA-168.
- **Admins:** tienen todo lo del Broker (ambos ilimitados) **para siempre**. No es una cortesía, se ve como "Admin" (VA-174).

---

## VA-165 · La categoría del modelo pasa a ser "recomendada" (cambia VA-153) — pedido obligatorio de un socio

- **Modelo de datos:** la categoría que hoy tiene cada modelo pasa a una columna nueva, **`recommendedCategoryId`** (renombrar o migrar la de VA-153, sin perder lo cargado). Mostrame el SQL.
- **Formulario de publicar:**
  - al elegir marca y modelo de la lista, **la categoría se completa con la recomendada, pero se puede cambiar**. Junto al campo: "Recomendada para este modelo: Monomotor Pistón";
  - si elige otra (aviones modificados): sin bloqueo ni advertencia que asuste. Como mucho, una línea: "Elegiste una categoría distinta de la recomendada";
  - **las reglas por categoría** (motores, horas, TBO) se aplican según la categoría **elegida**, no la recomendada;
  - si elige primero el tipo (por ejemplo, Agrícola), la lista de marcas y modelos se acota por la recomendada, con un link **"Ver todas las marcas"** para los modificados;
  - se quita el "¿La categoría no es correcta? Avisanos" (ya no hace falta).
- **Filtros de `/aircraft` y buscador de la Home:** las marcas que se muestran al elegir una categoría salen de los **avisos reales** de esa categoría, no de la recomendación (un modificado tiene que aparecer en su categoría elegida).
- **Admin de taxonomía:** el selector se llama "Categoría recomendada".
- **Producción:** VA-153 ya está aplicado ahí. Esta migración entra en VA-164.

---

## VA-166 · Planes Base, Pro y Broker según la grilla, con la grilla en `/plans` y en el admin (ajusta VA-152)

### Cambios sobre VA-152
- **Cupos:** Base **1 / 3** (era 1 / 5) y Pro **3 / 10** (era 3 / 15). "Empresarial" pasa a llamarse **"Broker / Empresa"**, con las opciones aviones ilimitados, repuestos ilimitados o ambos; lo no ilimitado tiene el cupo de **Base** (como ya está).
- **Beneficios por plan** (interruptores en el admin):
  - **Pro:** usuario verificado, destacadas (VA-168), Página VA actual o "banner en el perfil" (VA-169) y métricas Pro (VA-171);
  - **Broker:** todo lo del Pro, más la Página VA completa (VA-169), detalles personalizados (VA-170) y métricas completas (VA-171).

  Hoy, por decisión del 18/10, solo el Empresarial tenía Página VA y métricas: **esto lo reemplaza**.
- **Cuentas que hoy superan el cupo nuevo** (por el paso de 5 a 3 repuestos): conservan sus avisos (mismo criterio de VA-152) pero no pueden publicar ni activar más hasta quedar dentro del cupo. Informame cuántas hay.
- **Textos:** la ventana de bienvenida, los carteles, FAQ, términos y `/howtopublish` pasan a decir "1 avión y 3 repuestos gratis". Borrador para revisar.

### `/plans`: la grilla
- **Escritorio:** la misma grilla de la imagen. Columnas Base, Pro y Broker / Empresa; filas = características, con ✓ / ✗ o texto. En el encabezado, el precio real con la etiqueta "Promo de lanzamiento" y el tachado.
- **Columna Broker interactiva:** dos interruptores, **"Aviones ilimitados"** y **"Repuestos ilimitados"** (al menos uno prendido). Al cambiarlos se actualizan en vivo el precio ($55.000 o $85.000, y el tachado) y las filas de cupos (por ejemplo, "Sin límite" o "1"). El botón "Suscribirme" lleva al checkout con esa opción.
- **Celular:** tarjetas apiladas por plan con las mismas filas, el Broker con sus interruptores, y nada de scroll horizontal. Alternativa: grilla con la primera columna fija y desplazamiento lateral. Proponé la que se lea mejor y mostrame capturas.
- **Botones según el estado del usuario:** "Tu plan actual", "Suscribirme" o "Cambiar a este plan". Visitante → registrarse.
- Seguir `docs/DESIGN_GUIDELINES.md`.

### Admin: editar con la misma grilla
- En "Planes y precios", **la misma grilla editable**:
  - cada celda se edita en su lugar (número, ✓ / ✗ o texto corto);
  - en el encabezado, precio real y precio tachado de Pro y de las dos opciones del Broker;
  - **filas propias:** agregar, renombrar, ordenar y quitar filas de solo texto (marketing).
- **Filas que mueven la lógica del sistema:** cupos, republicaciones, verificado, destacadas, Página VA, detalles personalizados y nivel de métricas. Se marcan con un ícono y no se pueden borrar. Al editarlas se muestra qué cambia ("Pro pasa de 10 a 12 repuestos activos").
- **Cambiar el precio real** pide confirmación (como VA-59): vale para los cobros siguientes de los suscriptores y hay que avisarles. Mostrar cuántos suscriptores afecta.
- Vista previa de cómo queda en `/plans` antes de guardar.

### Aceptación
- Grilla igual a la de la imagen, en escritorio y celular.
- Los interruptores del Broker cambian el precio y los cupos.
- Editar una celda de cupo en el admin cambia el límite real (probado publicando).
- Cuenta Base: 1 avión y 3 repuestos activos; el 4.º repuesto pide pausar uno o pasarse a Pro.

---

## VA-167 · Republicar (las "renovaciones" de la grilla) y aviso en el perfil

- **Qué es:** **republicar** un aviso activo lo vuelve a poner **primero en "Últimas publicaciones"** y en el orden "Más recientes". No hay vencimiento (VA-152).
- **Modelo de datos:** campo nuevo **`republishedAt`** (o `lastPublishedAt`). El orden "recientes" y "Últimas publicaciones" usan `republishedAt ?? createdAt`. Mostrame el SQL. El detalle sigue mostrando la fecha de publicación original; si fue republicado, también "Actualizado el …".
- **Cuántas:**
  - **Base:** 2 cada 12 meses desde el alta de la cuenta;
  - **Pro:** 5 cada 12 meses desde el alta de la suscripción;
  - se reponen al cumplirse el año y no se acumulan. Las cantidades salen de la grilla del admin (VA-166).
  - Un mismo aviso no se puede republicar dos veces en menos de **7 días** (configurable), para que no se use todo el saldo en uno.
- **Broker:** botón **"Republicar todas"** en "Mis publicaciones", disponible **cada 30 días** desde la última vez. Republica todos sus avisos activos con un clic. Mientras no esté disponible: "Podés volver a republicar el dd/mm".
- **Admins:** como el Broker.
- **Dónde:** botón "Republicar" en cada aviso activo del perfil propio (con el saldo: "Te quedan 2 republicaciones hasta el dd/mm") y en el detalle propio. Confirmación simple.
- **Aviso en el perfil:** cuando hay republicaciones disponibles (o el Broker ya puede republicar todas):
  - un punto en el menú de usuario del header;
  - un cartel en "Mis publicaciones": "Tenés 2 republicaciones disponibles: volvé a poner tus avisos primero en Últimas publicaciones", con el botón "Elegir avisos".
  - Se puede cerrar y vuelve cuando cambia el saldo.
  - ❓ ¿También un mail cuando se reponen? Sugerido: sí, uno por reposición, con la opción de dejar de recibirlo.
- **Abuso:** la republicación no cambia el aviso ni su historial, solo el orden. Al pausar y reactivar no se republica.
- **Aceptación:**
  - Base republica 2 y la 3.ª no se puede;
  - el aviso republicado aparece primero en la Home;
  - al año se reponen;
  - el Broker republica todas y el botón se bloquea 30 días;
  - el cartel aparece con saldo y desaparece sin saldo.

---

## VA-168 · Destacadas por plan (Pro, Broker y admins)

- **Home, "Aeronaves destacadas":** muestra al azar avisos activos de cuentas **Pro, Broker o Admin**. Si son menos de 6, completa con otros avisos al azar entre los recientes (como hoy). Lo mismo para repuestos, si hay un bloque de destacados de repuestos.
- **Listados (`/aircraft` y `/spareparts`):** en el orden por defecto, primero los avisos de esas cuentas y después el resto (cada grupo por `republishedAt ?? createdAt`). **Si el usuario elige ordenar por precio, año, etc., se respeta ese orden** sin mezclar.
- ❓ ¿Etiqueta "Destacado" en la tarjeta? Sugerido: una marca discreta. Confirmar.
- La lógica sale del interruptor "Destacadas" del plan (VA-166), no del nombre del plan.
- **Aceptación:** con avisos de Base y de Pro, el listado por defecto muestra primero los Pro; ordenar por precio no los adelanta; la Home prioriza Pro y Broker y completa con otros.

---

## VA-169 · Página VA del Pro (la actual) y Página VA del Broker (nueva y armable)

- **Pro:** la Página VA actual (portada o banner, logo, nombre comercial y WhatsApp). Es el "banner en el perfil" de la grilla.
- **Broker (y admins): Página VA completa**, una "Home propia" que ven los demás usuarios al entrar a su perfil:
  - **banner** grande y **logo**, nombre comercial, insignia de verificado y datos de contacto;
  - **descripción opcional** (texto con formato simple, hasta ~1000 caracteres);
  - **secciones armables**, como la Home, que el Broker agrega, ordena (arrastrar o subir/bajar) y oculta:
    - **Carrusel**, con un título propio y avisos elegidos a mano o por regla (más recientes, una categoría, solo aviones o solo repuestos);
    - **Grilla de todos los avisos**, con un orden manual opcional (arrastrar) o por regla;
    - **Texto** ("Quiénes somos", "Servicios", "Horarios");
  - un máximo razonable (por ejemplo, 6 secciones) para que no se rompa el diseño.
- **Editor (lo más sencillo posible):** en "Mi cuenta" (el perfil propio), un botón **"Editar"** en la esquina abre el modo edición sobre la misma página: agregar sección, mover arriba o abajo, ocultar, borrar, y elegir avisos con casillas. Sin arrastrar si complica; con flechas alcanza. Guardar o Cancelar. Ver VA-175.
- **Editor en el perfil propio** ("Personalizar mi Página VA"), con vista previa en escritorio y celular, y "Publicar cambios". Siempre con el diseño de la web: elige contenido y orden, no colores ni tipografías libres.
- **Si el Broker baja de plan:** la página vuelve a la del Pro o a un perfil común. La configuración se guarda por si vuelve.
- Mostrame el modelo de datos (por ejemplo, `ProfilePage` con secciones en JSON validado) y el SQL.

---

## VA-170 · Detalle de avisos de Brokers: más vistoso, con la misma información (definido con el socio el 19/10)

**Principio:** misma línea estética que el resto de la web. Se ve más cuidado y con la marca del Broker, pero **no** es otro sitio, y **no se pierde nada** de lo que muestra el detalle común.

### Lo que no cambia (obligatorio)
- **Las grillas** ("Datos de la aeronave", General, Motor, Hélice, Aviónica, Implementos agrícolas, Exterior, Interior, etc.) tienen **exactamente los mismos datos, en la misma cantidad y disposición** que el detalle común. Se reutilizan los mismos componentes y `lib/aircraft-fields.ts`; no se duplica la lista de campos.
- **La galería y el zoom** funcionan igual: deslizar, flechas (VA-160), abrir en pantalla completa, zoom, X para cerrar y miniaturas. Solo cambia el marco visual.
- **Todo lo demás que tiene el común,** en el mismo orden lógico: preguntas, compartir, favorito, comparar, reportar, PDF, mapa de zona y recomendaciones.
- **Repuestos:** mismo criterio.

### Lo que cambia
1. **Encabezado con banner del Broker:**
   - arriba de la galería, una franja de ancho completo con **la imagen de portada que sube el Broker** (la de su Página VA o una propia para los detalles);
   - si no subió nada, **una portada estándar de Ventas Aeronáuticas**;
   - sobre la franja: logo, nombre comercial, insignia de verificado y "Ver Página VA".
2. **Fotos con degradé:** la foto principal se funde con un **degradé** hacia el fondo de la página (por ejemplo, hacia abajo, donde arrancan el título y el precio), así la galería se integra con la página en vez de ser un recuadro.
   - Solo decoración: la foto se ve entera al tocarla y en el zoom.
   - Proponé 2 variantes (degradé hacia abajo o hacia el costado del bloque de precio) con capturas a 375 y 1280 px, para elegir.
3. **Datos clave grandes:** debajo del título y el precio, 4 a 6 tarjetas grandes con ícono (año, horas totales, motor, TBO restante, categoría y ubicación; en repuestos, condición, P/N, compatibilidad y ubicación).
   - Son un **resumen extra**: la ficha completa sigue abajo igual que en el común.
   - Si un dato no está cargado, esa tarjeta no se muestra.
4. **Personalización acotada** (en Ajustes de la Página VA):
   - portada propia para los detalles;
   - logo;
   - **un color de acento** elegido de una paleta cerrada de 6 a 8 colores que combinan con la web, usado solo en detalles (bordes, íconos de las tarjetas, subrayados);
   - los botones principales y las tipografías son siempre los de VA.
5. **Video de YouTube (opcional):** el Broker pega el link en el formulario del aviso.
   - **En la base es solo un texto corto** (unos 50 a 100 caracteres), como una URL más.
   - El video **no se aloja** en nuestro storage.
   - Se muestra como una miniatura más dentro de la galería, con ícono de play. **El reproductor se carga solo al tocarla** (para no sumar peso a la página), con `youtube-nocookie.com`.
   - Validar que sea un link de YouTube (`youtube.com/watch`, `youtu.be` o `/shorts`).
   - Sumarlo a la política de privacidad y al inventario de cookies (VA-155): YouTube carga solo si el usuario reproduce el video.
6. **"Más de [Broker]"** con sus otros avisos, antes de las recomendaciones generales.
7. **PDF del aviso con su logo,** junto al de VA.
8. **Contacto:** los mismos botones del común, más visibles. En celular, una barra fija abajo con WhatsApp y Llamar, que no tape "Aplicar filtros" ni la bandeja del comparador. ❓ Confirmar con el socio (no lo eligió explícitamente).

### Para el Pro
- Detalle común, con la insignia de verificado y el link a su Página VA en el bloque de vendedor.

### Proceso
- Primero un prototipo en un aviso de prueba de un Broker (escritorio y celular) y capturas.
- **No avanzar sin el OK del socio.**
- Medir que el detalle no sume JS por encima de lo actual (más allá del reproductor, que se carga al tocar).

---

## VA-171 · Métricas por plan (Base, Pro y Broker)

| Métrica | Base | Pro | Broker |
|---|---|---|---|
| Vistas y contactos por aviso (lo de hoy) | ✓ | ✓ | ✓ |
| Panel de VA-151 (vistas, contactos, favoritos y visitas al perfil, con variación; vistas por día; contactos por canal; tabla por aviso) | — | ✓ (7 y 30 días) | ✓ |
| Períodos de 90 días y rango personalizado | — | — | ✓ |
| Fuentes de tráfico (Google, redes, WhatsApp, directo, otros) | — | — | ✓ |
| Provincia aproximada de los visitantes (agregada, sin datos personales) | — | — | ✓ |
| Veces que se agregó al comparador, por aviso | — | — | ✓ |
| Página VA: visitas y clics hacia sus avisos desde la página | — | — | ✓ |
| Efecto de las republicaciones (vistas antes y después) | — | — | ✓ |
| Exportar CSV | — | — | ✓ |

- **El nivel sale del interruptor del plan:** básico, Pro o completo. Reutilizar el panel de VA-151 y sumar las secciones del Broker.
- **Mismas reglas de datos que VA-151:** sin el dueño, admins ni bots; solo totales, nunca quién; consultas agregadas con caché; retención suficiente (si 90 días o más necesita más retención, decime cuánto pesa).
- **Cookies:** las fuentes de tráfico usan `va_src`, que solo existe con "Aceptar" (VA-155). Aclarar en el panel que esos números son parciales.

---

## VA-172 · Buscar Brokers por nombre en el buscador

- El buscador del header (escritorio y celular) también busca **por nombre comercial de Brokers** (y de admins con Página VA publicada).
- **Resultados:**
  - primero, si hay coincidencias, un bloque **"Vendedores"** con los Brokers (logo y **nombre en negrita**, cantidad de avisos y link a su Página VA), máximo 3 con "Ver más";
  - abajo, el **interruptor Aviones / Repuestos** con los avisos, como hoy.
  - Si no hay Brokers que coincidan, se ve igual que ahora.
- Lo mismo en la página de resultados de `/search`, si existe.
- Sin cuentas Base ni Pro en ese bloque (no tienen Página VA completa).
- Índice o búsqueda eficiente sobre el nombre comercial (sin `ILIKE` sobre toda la tabla de usuarios en cada tecla; con debounce como hoy).

---

## VA-173 · Admin: cuentas por tipo y gastos fijos

- **Dashboard del admin, contador de cuentas por tipo:**
  - Base;
  - Pro;
  - Broker (aviones, repuestos y ambos, por separado y en total);
  - Admin;
  - cortesías, si siguen existiendo para alguien que no sea admin.

  Con la variación del mes y el link a `/admin/users` filtrado por tipo.
- **Gastos fijos (VA-102, pasa al MVP):** pestaña en el admin con los gastos fijos de la web (nombre, monto, moneda ARS o USD, frecuencia mensual o anual, desde cuándo y notas). Tipo de cambio manual con fecha, total mensual en ARS y un KPI de cobertura en rojo o verde en el dashboard (ingresos de suscripciones del mes contra gastos fijos). Es de referencia: no factura ni paga nada.

---

## VA-174 · Admins: cuenta Broker completa para siempre

- Todo usuario con `isAdmin` tiene **los beneficios del Broker con ambos ilimitados**, sin suscripción, sin vencimiento y sin figurar como cortesía.
- En el perfil y en el admin se ve **"Admin"** como tipo de cuenta.
- Su perfil y sus detalles se ven como los de un Broker (VA-169 y VA-170), más sus herramientas de admin.
- No cuentan en ingresos ni KPIs de suscripciones (sí en el contador de cuentas como "Admin").
- Si a alguien se le quita el admin, pasa a Base (o a su suscripción, si tiene). Avisame si queda por encima del cupo.
- Las suscripciones de cortesía que hoy tienen los admins (migradas en VA-152) se cierran sin afectar sus avisos.

---

## VA-175 · Página "Ajustes" aparte y botón "Editar" en "Mi cuenta"

- **Nueva página `/settings` ("Ajustes")**, en el mismo menú desplegable del usuario que "Favoritos" (escritorio y celular), con `noindex`.
- **Se mueve ahí todo lo que sea configuración de la cuenta.** Hoy está repartido en "Mi cuenta" y en la pestaña Ajustes del perfil. Inventario a confirmar con Code:
  - datos personales (nombre, teléfono, ubicación, foto) y tipo de cuenta;
  - email y contraseña (cambiar contraseña);
  - plan y suscripción (ver plan, cancelar o seguir suscripto, link a `/plans`) y "Mis compras";
  - datos de facturación;
  - notificaciones por mail (republicaciones, VA-167) y preferencia de cookies (link al cartel de VA-155);
  - Página VA del Pro y del Broker: nombre comercial, logo, portada, WhatsApp, color de acento (VA-170) y portada de detalles.
- Una sola columna, secciones con título, un botón "Guardar" por sección y mensajes claros. Primero celular.
- **"Mi cuenta"** (el perfil propio) queda para **ver**: la Página VA o el perfil, las publicaciones, las métricas y las republicaciones.
  - Para Pro y Broker, botón **"Editar"** en la esquina superior derecha: abre el modo edición de cómo se ve la página (carruseles, secciones y orden; VA-169) y, para la imagen y los datos, un link a Ajustes.
  - Base no ve "Editar" (no tiene página armable); si tiene, un link a Ajustes.
- **Los links viejos** a la pestaña de ajustes del perfil redirigen a `/settings`.
- **Hacerlo lo más sencillo posible:** reutilizar los formularios que ya existen, moviéndolos, sin rehacerlos.

## Orden sugerido

1. VA-165;
2. VA-166 con VA-174 (cambian la misma lógica de planes);
3. VA-167;
4. VA-168;
5. VA-171;
6. VA-169;
7. VA-175 (Ajustes y botón "Editar", antes o junto con VA-169);
8. VA-170 (prototipo y OK del socio);
9. VA-172;
10. VA-173.

Después, VA-164 (producción) con todo junto.
