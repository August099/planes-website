# VA-85 · Administración de guías + 6 guías nuevas

## Parte A · Administración de guías en el panel admin
- Pasar las guías de `lib/guides.ts` a la base: modelo `Guide` con slug (único, en inglés), title, excerpt, audience (comprador/vendedor/todos), icon (nombre de lucide), metaDescription, sections (JSON: `[{ heading, paragraphs[], bullets[] }]`), `status` (DRAFT | PUBLISHED), order, updatedAt y reviewedBy (texto opcional).
- Script de semilla que cargue las guías actuales de `lib/guides.ts` como PUBLISHED y las 6 nuevas de este documento como **DRAFT**. Las nuevas no se publican hasta que el socio las revise y las active desde el admin.
- Sección "Guías" en el admin, con el mismo estilo que Cupones:
  - Listado con estado, fecha de actualización y orden.
  - Crear, editar, duplicar, publicar y despublicar.
  - Editor estructurado: lista de secciones (título + párrafos + viñetas) con botones para agregar, quitar y reordenar. Sin dependencias nuevas de editor.
  - Vista previa antes de publicar.
  - Validación: el slug es único y en minúsculas con guiones, y la metaDescription tiene 155 caracteres como máximo.
- Las páginas `/services/guides` y `/services/guides/[slug]` siguen siendo estáticas: generateStaticParams desde la base (solo PUBLISHED) y `revalidatePath` al guardar o publicar desde el admin. La sección de guías de la Home muestra las 4 primeras PUBLISHED según `order`.
- Las DRAFT devuelven 404 al público. El admin las ve en la vista previa.
- Sitemap y JSON-LD solo con las PUBLISHED.
- Al terminar de migrar, `lib/guides.ts` deja de ser la fuente de las páginas: queda solo para la semilla, o se elimina.

## Parte B · Contenido de las 6 guías nuevas (cargar como DRAFT)
Para todas:
- Al pie, el aviso legal estándar de las guías.
- Voseo, sin relleno.
- Todo dato normativo lleva un link a la fuente oficial indicada.
- No agregar cifras de costos ni plazos que no estén acá.

---

### 1. `cost-of-owning-an-aircraft` — "Cuánto cuesta tener un avión: los gastos que nadie te cuenta"
- audience: comprador · icon: Calculator
- excerpt: Hangar, seguro, inspecciones, combustible y la reserva para la recorrida: cómo armar tu presupuesto anual antes de comprar.
- metaDescription: Los costos fijos y variables de tener un avión en Argentina y cómo calcular la reserva para la recorrida general del motor.
- Secciones:
  1. **El precio de compra es solo el principio.** Al presupuesto anual hay que sumarle gastos fijos (que se pagan aunque no vueles) y variables (que dependen de las horas de vuelo). Conviene calcularlos antes de comprar, no después.
  2. **Gastos fijos.** Viñetas:
     - Hangar o plataforma.
     - Seguro (responsabilidad civil y, si querés, casco).
     - Inspección anual y mantenimiento calendario.
     - Cuota del aeroclub, si corresponde.
     - Actualización de cartas y bases de datos de aviónica.
     - Imprevistos (conviene reservar un margen).
  3. **Gastos variables (por hora de vuelo).** Viñetas:
     - Combustible (consumo por hora × precio del litro en tu zona).
     - Aceite.
     - Mantenimiento por horas (inspecciones periódicas, cambios de aceite y filtros).
     - Tasas de aterrizaje y estacionamiento.
     - Reserva para la recorrida del motor y de la hélice.
  4. **La reserva para la recorrida general.** Párrafo:
     - Cada motor tiene un TBO (tiempo recomendado entre recorridas) fijado por el fabricante.
     - Para no llevarte una sorpresa, dividí el costo estimado de la recorrida por las horas de TBO: eso es lo que tenés que reservar por cada hora que volás.
     - Ejemplo de cálculo, sin cifras reales: si una recorrida cuesta X y el TBO es de 2.000 h, reservás X/2.000 por hora.
     - Hacé lo mismo con la hélice.
     - Pedí el presupuesto de recorrida a un taller habilitado.
  5. **Cómo armar tu número.** Viñetas:
     - Estimá cuántas horas por año vas a volar.
     - Sumá los fijos anuales.
     - Multiplicá el costo variable por hora por tus horas.
     - Dividí el total por las horas para saber tu costo real por hora.
     - Compará con alquilar en un aeroclub: si volás pocas horas, alquilar puede convenir.
  6. **Ideas para bajar costos.** Copropiedad con otros pilotos (con un acuerdo escrito), hangar compartido, volar más horas (diluye los fijos), elegir modelos con repuestos y mecánicos disponibles en tu zona.
- CTA: "Ver aeronaves en venta" → `/planes` · Link interno a la guía de compra.

### 2. `choosing-your-first-aircraft` — "Cómo elegir tu primer avión"
- audience: comprador · icon: Compass
- excerpt: Definí para qué lo vas a usar, cuánto podés gastar por año y qué tan fácil es mantenerlo en tu zona.
- metaDescription: Qué tener en cuenta para elegir tu primer avión: uso, cantidad de plazas, ala alta o baja, costos y disponibilidad de repuestos.
- Secciones:
  1. **Empezá por la misión, no por el modelo.** Preguntas: ¿vuelos locales de fin de semana o viajes largos? ¿Cuántas personas y cuánto equipaje? ¿Desde qué tipo de pista (asfalto, tierra, pasto)? ¿Vas a hacer horas para una licencia?
  2. **Plazas, velocidad y carga útil.** Más plazas y más velocidad suelen significar más consumo, más mantenimiento y un seguro más caro. Revisá la carga útil real (con combustible y pasajeros), no solo la cantidad de asientos.
  3. **Ala alta o ala baja.** Viñetas: visibilidad hacia abajo y sombra (ala alta); visibilidad en virajes y facilidad para cargar combustible (según el modelo); acceso a la cabina. No hay una mejor: depende del uso y del gusto del piloto.
  4. **Tren fijo o retráctil, paso fijo o variable.** Más complejidad mejora la performance, pero también suma mantenimiento y requiere habilitaciones o adaptación. Para un primer avión, lo simple suele ser lo más sensato.
  5. **Repuestos y mecánicos cerca.** Antes de enamorarte de un modelo, averiguá si hay talleres que lo conozcan en tu zona y si los repuestos se consiguen. Un modelo popular es más fácil de mantener y de revender.
  6. **Presupuesto anual, no solo el precio.** Link a la guía de costos.
  7. **Próximo paso.** Link al checklist de pre-compra.
- CTA: "Explorar por tipo de aeronave" → `/planes`.

### 3. `private-pilot-license-argentina` — "Cómo sacar la licencia de piloto privado de avión en Argentina"
- audience: todos · icon: GraduationCap
- excerpt: Requisitos de edad, certificado médico, horas de vuelo y exámenes ante ANAC, explicados paso a paso.
- metaDescription: Requisitos de ANAC para la licencia de piloto privado de avión: edad, certificado médico, 40 horas de vuelo y exámenes.
- Fuente obligatoria (link visible): ANAC, Nota informativa N° 60 / DLP, requisitos por licencia: https://www.argentina.gob.ar/sites/default/files/nota_informativa_ndeg_60_-requisitos_para_cada_licencia.pdf (RAAC Parte 61, Subparte E).
- Secciones (usar SOLO estos datos):
  1. **Requisitos básicos.** Viñetas:
     - Tener 17 años.
     - Certificado de estudios primarios o equivalente reconocido.
     - Certificado médico aeronáutico Clase II vigente.
  2. **Horas de vuelo.** Viñetas:
     - 40 horas de instrucción en total.
     - De esas, al menos 30 en doble comando, 6 de travesía y 10 de vuelo solo (están incluidas en las 40).
     - Los menores de 18 años necesitan autorización de padres o tutores, certificada por escribano o juez de paz, para volar solos.
  3. **Exámenes.** Viñetas:
     - Examen teórico ante ANAC (TCEXAM).
     - Evaluación práctica: un formulario firmado y sellado por el inspector, el instructor y el aspirante, que se presenta ante ANAC.
  4. **Documentación para el trámite.** Viñetas:
     - Formulario de solicitud de ANAC.
     - Foto 4×4.
     - Copia del documento de identidad.
     - Comprobante del pago del arancel.
     - Libro de vuelo con la actividad firmada por el alumno, el instructor y el director de la escuela o aeroclub.
  5. **Dónde estudiar.** En un aeroclub o una escuela de vuelo habilitada (CIAC). Párrafo breve sobre comparar flota, disponibilidad de instructores y de aviones, y ubicación. Sin costos.
  6. **Antes de empezar.** Consultá los requisitos vigentes en el sitio de ANAC, porque pueden cambiar.
- CTA: "Ver aviones de entrenamiento" → `/planes` (filtrado por la categoría Avión ligero si existe).

### 4. `buying-aircraft-parts-safely` — "Cómo comprar repuestos aeronáuticos sin riesgos"
- audience: comprador · icon: ShieldCheck
- excerpt: Número de parte, condición, trazabilidad y documentación: qué pedir antes de pagar un repuesto.
- metaDescription: Qué revisar al comprar repuestos de aviación: número de parte, condición (nuevo, overhauled, serviceable), trazabilidad y certificados.
- Secciones:
  1. **Empezá por el número de parte (P/N).** Confirmá en el catálogo de partes del fabricante o con tu taller el P/N exacto y sus alternativas aprobadas, y la aplicabilidad a tu número de serie.
  2. **La condición del repuesto.** Viñetas con las condiciones habituales del mercado:
     - Nuevo (NE).
     - Nuevo excedente (NS).
     - Recorrido / overhauled (OH).
     - Inspeccionado y apto / serviceable (SV).
     - Tal como se desmontó / as removed (AR), que necesita inspección antes de instalarse.
     Explicar que el precio y lo que se puede instalar dependen de esto.
  3. **Trazabilidad y documentación.** Pedí la documentación que acredite el origen y la aptitud: certificado de conformidad o liberación (en piezas importadas son comunes el formulario FAA 8130-3 o el EASA Form 1) y el historial si es un componente con vida limitada (horas y ciclos). Sin papeles, un repuesto puede no ser instalable aunque esté impecable.
  4. **Señales de alerta.** Viñetas:
     - Precio muy por debajo del mercado.
     - Vendedor que no muestra fotos de la placa de identificación o de los papeles.
     - Placas ilegibles o adulteradas.
     - Presión para pagar ya.
     - Piezas "como nuevas" sin documentación.
  5. **La última palabra la tiene tu taller.** Antes de comprar, consultá con el TAR que lo va a instalar si el repuesto y su documentación son aceptables.
  6. **Al publicar un repuesto.** Si vendés: P/N, condición, fotos de la placa y de la documentación. Esos avisos generan confianza y se venden antes.
- CTA: "Ver repuestos" → `/spareparts`.

### 5. `renting-or-buying-a-hangar` — "Alquilar o comprar un hangar: qué mirar"
- audience: todos · icon: Warehouse
- excerpt: Medidas de puerta, servicios en la pista, acceso y contrato: la lista para no equivocarte con el hangar.
- metaDescription: Qué revisar antes de alquilar o comprar un hangar: medidas de la puerta, servicios del aeródromo, acceso, seguridad y contrato.
- Secciones:
  1. **Las medidas que importan.** El ancho y el alto de la puerta definen qué entra; después, el fondo y el ancho interior. Compará con la envergadura, la altura en el timón y el largo de tu aeronave, dejando margen para maniobrar.
  2. **Hangar compartido, individual o plataforma.** Ventajas y cuidados de cada uno: costo, riesgo de golpes al mover otras aeronaves y acceso.
  3. **La pista y sus servicios.** Viñetas: tipo y estado de la pista, combustible disponible, taller o escuela en el aeródromo, iluminación, distancia a tu casa.
  4. **Seguridad y acceso.** Viñetas: horarios y acceso 24 h, vigilancia o cámaras, quién más tiene llave, qué cubre el seguro.
  5. **El contrato.** Viñetas: plazo, actualización del precio, qué incluye (electricidad, limpieza), responsabilidad por daños, preaviso para dejarlo, y si está permitido hacer mantenimiento adentro.
  6. **Si comprás.** Verificá la situación del terreno y la concesión o permiso de uso dentro del aeródromo antes de pagar (con asesoramiento profesional).
- CTA: "Ver hangares disponibles" → `/services/hangars` (si todavía no existe, `/services`).

### 6. `selling-aircraft-parts` — "Cómo publicar un repuesto que se venda"
- audience: vendedor · icon: Tag
- excerpt: Número de parte, condición clara, buenas fotos y documentación: lo que hace que un comprador te escriba.
- metaDescription: Consejos para vender repuestos aeronáuticos: número de parte, condición, fotos de la placa y documentación en el aviso.
- Secciones:
  1. **Título con P/N y aplicación.** Por ejemplo "Magneto Slick 4371 — Lycoming O-320", en vez de "Magneto en buen estado".
  2. **Condición explicada.** Usá las condiciones estándar (link a la guía 4) y aclará las horas y ciclos si corresponde.
  3. **Fotos que generan confianza.** Viñetas: la pieza completa, la placa de identificación legible, los detalles de desgaste y la documentación (podés tapar datos personales).
  4. **Documentación disponible.** Indicá qué papeles tiene. Si no tiene, decilo: evita consultas perdidas y reclamos.
  5. **Precio y envío.** Compará con avisos similares, aclarás si hacés envíos y cómo embalás piezas delicadas.
  6. **Respondé rápido.** Las preguntas sin respuesta enfrían la venta.
- CTA: "Publicar un repuesto" → `/publish`.

## Aceptación
- El admin puede crear, editar, previsualizar, publicar y despublicar guías.
- Las 6 nuevas quedan en DRAFT y no son visibles al público hasta publicarlas.
- Las páginas siguen siendo estáticas y se actualizan al guardar.
- El sitemap solo lista las publicadas.
