# VA-91 · Herramientas para pilotos y propietarios (`/services/tools`)

> **Prioridad mobile (máxima):** estas herramientas se van a usar sobre todo desde el celular, en el aeródromo o antes de volar. Diseñá primero para 375 px:
> - inputs grandes con el teclado numérico correcto (`inputMode="decimal"`), sin zoom de iOS (font-size ≥ 16 px);
> - resultado visible sin hacer scroll mientras se cargan los datos (resultado fijo arriba, o que se actualiza en vivo debajo de cada campo);
> - botones de al menos 44 px y nada que dependa del hover;
> - carga instantánea: cálculos en el navegador, sin esperas.
>
> Seguí `docs/DESIGN_GUIDELINES.md`.

## Generales
- Rutas en inglés dentro de Servicios:
  - índice `/services/tools`;
  - una página por herramienta: `/services/tools/weather`, `/sun`, `/crosswind`, `/fuel`, `/density-altitude`, `/cost-per-hour` y `/unit-converter`.
- En `/services`, sumar una tarjeta "Herramientas" a "Disponible ahora". Sin link en el header. Link en el footer.
- **Libres para todos**, sin cuenta. Lo que se recuerda se guarda en localStorage con try/catch: unidades preferidas, aeródromos favoritos y la última localidad.
- **Unidades:** por defecto nudos, pies, hPa, litros, kilos y °C. Un selector en cada herramienta permite cambiarlas y la elección queda recordada.
- **Aviso fijo en cada herramienta:** "Herramienta orientativa. No reemplaza la información meteorológica oficial, el manual de vuelo de la aeronave ni la planificación del piloto."
- Cada herramienta tiene metadata y JSON-LD (WebApplication o el tipo que corresponda), y va en el sitemap.
- Sin patrocinio por ahora.

## 1. Clima aeronáutico (`/weather`): versión simple
- **Datos:** METAR y TAF desde la Data API pública de aviationweather.gov (NOAA). Leé su documentación y sus límites de uso antes de integrarla.
  - Se consulta desde el servidor (route handler), con caché de 5–10 minutos por estación.
  - Nunca se llama a la API desde el navegador de cada usuario.
- **Lista de aeródromos:** las estaciones de Argentina que reportan METAR. Se arma una vez desde el endpoint de información de estaciones de esa misma API y se guarda en un JSON del repo, con código OACI, nombre, localidad y coordenadas. El JSON incluye un script para regenerarlo.
- **Interfaz:**
  - un buscador por nombre, ciudad o código OACI;
  - una tarjeta con el METAR traducido a lenguaje claro: viento (dirección y velocidad, ráfagas), visibilidad, nubes, temperatura y punto de rocío, QNH y hora de la observación en hora argentina, con "hace X min";
  - el texto crudo del METAR plegable debajo;
  - el TAF traducido por bloques horarios;
  - una etiqueta de condición (VMC/IMC aproximada) con colores accesibles y su texto, no solo el color.
- Para decodificar se puede usar `metar-taf-parser` (MIT) como dependencia aprobada, o un parser propio si queda más liviano.
- **Aeródromo más cercano:**
  - Al entrar, si el usuario no tiene un aeródromo guardado, se le pide permiso de ubicación con un botón claro "Ver el más cercano a mí". No se pide automáticamente al cargar la página.
  - Con la ubicación se muestra el aeródromo con METAR más cercano y su distancia.
  - Siempre se puede buscar cualquier otro.
- **Favoritos:** estrella para guardar aeródromos (en localStorage) y verlos en la parte de arriba en las próximas visitas.
- Si la estación no reporta o la API falla: "No hay datos recientes para esta estación".
- No se muestra en la Home.

## 2. Sol y crepúsculo (`/sun`)
- Elegir una localidad (buscador con la API Georef o con la lista de aeródromos) o usar la ubicación del usuario.
- Para **hoy y los próximos 7 días**: inicio del crepúsculo civil matutino, salida del sol, puesta del sol y fin del crepúsculo civil vespertino, en hora argentina.
- Cálculo local con `suncalc` (dependencia aprobada), sin APIs.
- **Mobile:** hoy destacado arriba, en grande, con un "faltan 2 h 15 min para la puesta" cuando corresponda; los siguientes días en una lista compacta debajo.

## 3. Viento cruzado y de frente (`/crosswind`)
- Entradas: dirección y velocidad del viento (con ráfagas opcionales) y rumbo de la pista. La pista se puede ingresar como número ("18") o en grados.
- Salidas: componente cruzado (indicando de qué lado viene) y componente de frente o de cola, con un esquema visual simple de la pista y el viento en SVG.
- Opcional: cargar el límite demostrado de viento cruzado del avión y mostrar un aviso si se supera.

## 4. Combustible necesario (`/fuel`)
- Entradas: tiempo de vuelo estimado, consumo por hora, combustible para rodaje y una reserva, en minutos o como porcentaje, configurable.
- Salida: combustible total necesario en litros y galones, con el desglose.
- Sin valores reglamentarios por defecto: el usuario carga su reserva. Un texto aclara que verifique la reglamentación vigente.

## 5. Altitud de densidad (`/density-altitude`)
- Entradas: elevación del aeródromo (se autocompleta si se elige un aeródromo de la lista), QNH y temperatura.
- Salidas: altitud de presión, temperatura ISA a esa altitud y altitud de densidad, con una nota en lenguaje simple ("la performance de tu avión será como si estuvieras a X pies").
- Fórmulas estándar documentadas en el código.
- Si el usuario eligió un aeródromo con METAR, botón "Usar datos del METAR actual".

## 6. Costo real por hora de vuelo (`/cost-per-hour`)
- Entradas:
  - fijos anuales: hangar, seguro, anual/inspecciones, cuota y otros;
  - variables por hora: consumo × precio del combustible, aceite y mantenimiento por horas;
  - reserva para la recorrida (costo estimado ÷ TBO, para motor y hélice);
  - horas voladas por año.
- Salidas: costo total anual y costo real por hora, con un gráfico simple de la composición (fijos, variables y reserva) y una línea que muestra cómo baja el costo por hora si se vuela más.
- Link a la guía "Cuánto cuesta tener un avión" y CTA "Ver aeronaves en venta".
- Botón para compartir el resultado: los valores van en la URL. No incluye datos personales.

## 7. Conversor de unidades (`/unit-converter`)
- Pares: kg ↔ lb, litros ↔ galones US, nudos ↔ km/h ↔ mph, pies ↔ metros, hPa ↔ inHg, °C ↔ °F, millas náuticas ↔ km.
- Además, combustible por peso: litros de AVGAS ↔ kg ↔ lb, con la densidad estándar editable.
- **Mobile:** un solo campo grande que convierte en vivo hacia todas las unidades de esa magnitud a la vez, con pestañas por magnitud.

## Índice `/services/tools`
- Una tarjeta por herramienta, con ícono, nombre y una línea de descripción. En mobile, una lista vertical cómoda.
- Las herramientas usadas recientemente quedan arriba (localStorage).

## Aceptación
- Las 7 herramientas funcionan sin cuenta y sin errores a 360, 375 y 414 px, y en desktop.
- Teclado numérico correcto en todos los campos y sin zoom de iOS.
- El clima trae datos reales de al menos 5 aeródromos argentinos, con caché en el servidor. El permiso de ubicación se pide solo al tocar el botón y el aeródromo más cercano es correcto.
- Las unidades por defecto se pueden cambiar y quedan recordadas.
- Los resultados de viento cruzado, altitud de densidad y conversiones coinciden con valores de referencia: incluir tests unitarios de las fórmulas.
- Capturas de cada herramienta a 375 px.
