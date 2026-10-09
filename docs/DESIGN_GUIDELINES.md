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
