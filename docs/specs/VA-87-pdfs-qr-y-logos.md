# VA-87 · PDFs actualizados con QR (+ PDF de hangares) y logos al revés en la Home

> **Orden:**
> - La Parte A va después de VA-83, porque reutiliza la lista de campos compartida que se crea ahí.
> - La parte del PDF de hangares va junto con VA-84, o después.
> - La Parte B (logos) es chica: hacela primero, en cualquier momento.

## Parte A · PDFs de los avisos

### Estado actual
Los PDFs se generan con `@react-pdf/renderer`: `AircraftPDF.tsx` y `SparePartPDF.tsx`. Quedaron desactualizados respecto del detalle rediseñado (VA-57) y de los campos nuevos del formulario.

### Contenido actualizado
- **Aeronave**: usar la misma lista de campos y etiquetas que el detalle y el comparador (`lib/aircraft-fields.ts`, de VA-83), con las mismas secciones y el mismo orden:
  - Características
  - General
  - Motor (en bimotores, Motor 1 / Motor 2)
  - Hélice
  - Aviónica
  - Equipamiento
  - Exterior
  - Interior
  - Implementos agrícolas (si corresponde)
  - Documentación
  - Condiciones de venta: financiación, permuta, alquiler y "negociable"

  Ningún campo completado del formulario puede faltar en el PDF; los vacíos no se muestran.
- **Repuesto**: todos los campos actuales del detalle: P/N, condición, stock, categoría, aeronave asociada, etc.
- **Encabezado**:
  - Logo de Ventas Aeronáuticas, en la orientación correcta (ver Parte B).
  - "Publicado el …" y "Ubicación aproximada: Ciudad, Provincia" en la misma línea, como en el detalle.
- **Vendedor**: nombre, tipo de perfil, insignia de verificado o de página personalizada si la tiene, y los datos de contacto que el vendedor tenga visibles en la web. No agregar datos que no estén públicos.
- **Fotos**: la principal grande y hasta 4 miniaturas, comprimidas para que el PDF no pese de más.

### QR
- Agregar `qrcode` como dependencia. Es una excepción aprobada a la regla de no sumar dependencias.
- Generar el QR del lado del servidor como PNG en data URL e insertarlo con `<Image>` de react-pdf.
- El QR apunta a la URL pública y canónica del aviso, con `?utm_source=pdf&utm_medium=qr`, para medir cuántas visitas llegan desde PDFs impresos.
- Ubicación: en el pie de la primera página, de unos 2,5 cm, con el texto "Escaneá para ver el aviso actualizado, más fotos y contactar al vendedor" y la URL corta escrita debajo, para quien no pueda escanear.
- Contraste alto (negro sobre blanco), con el margen de silencio que necesita el QR para leerse bien.
- Si el aviso no está activo, el PDF igual se puede generar para el dueño, pero el QR lleva al aviso con el cartel de "no disponible".

### PDF de hangares (con VA-84)
- `HangarPDF.tsx`, con la misma estructura y estilo que los otros dos.
- Destacar arriba: tipo de publicación (alquiler de espacio, alquiler de hangar o venta), aeródromo, código OACI/ANAC y precio con su período.
- Bloque de medidas bien visible: puerta (ancho × alto), ancho y fondo interior, superficie, lugares disponibles y tipos de aeronave que entran.
- Servicios en forma de lista, disponibilidad, descripción, fotos, vendedor y QR con las mismas reglas.
- Botón "Descargar PDF" en el detalle del hangar, igual que en aeronaves y repuestos.

### Aceptación (Parte A)
- Generar el PDF de:
  - un monomotor con todos los campos completos;
  - un bimotor;
  - un agrícola con implementos;
  - un repuesto;
  - un hangar (cuando exista VA-84).
- Verificar que no falta ningún dato completado.
- El QR se escanea con un celular y abre el aviso correcto con los parámetros UTM.
- Cada PDF pesa menos de 2 MB.
- Adjuntar los PDFs generados.

## Parte B · Logos que se ven al revés en el fondo de la Home
- En el fondo de la Home hay dos siluetas del logo "VA//" que se ven espejadas o invertidas: las barras inclinadas para el lado contrario, o la figura al revés.
- Encontralas: buscá en la Home, en hero-banner, en el motivo "//" agregado en VA-79, en `globals.css` y en las imágenes de fondo. Revisá si tienen `scale-x-[-1]`, `-scale-x-100`, `rotate-180`, `transform: scaleX(-1)` o un SVG con un path invertido.
- Corregilas para que tengan exactamente la misma orientación que `public/logo-mark.svg`, el logo del header.
- Si la silueta está "horneada" dentro de una imagen de fondo (PNG/WebP), avisame y decime cuál es el archivo antes de editar la imagen.
- **Aceptación**: captura de la Home a 1280 px y a 375 px con las dos siluetas orientadas igual que el logo del header.
