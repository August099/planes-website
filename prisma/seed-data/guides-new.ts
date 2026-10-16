import { guidePath, type GuideSeed } from "../../lib/guides";

// VA-85 (parte B): las 6 guías nuevas de docs/specs/VA-85-guias-admin-y-nuevas.md. La semilla las
// carga como DRAFT: no se ven en el sitio hasta que el socio las revise y las publique desde
// /admin/guides. Reglas del spec: voseo, sin relleno, sin cifras de costos ni plazos que no estén
// en el spec, y todo dato normativo con link a la fuente oficial indicada. El aviso legal estándar
// lo agrega la página al pie de todas las guías.

const COSTS = "cost-of-owning-an-aircraft";
const FIRST = "choosing-your-first-aircraft";
const LICENSE = "private-pilot-license-argentina";
const PARTS_BUY = "buying-aircraft-parts-safely";
const HANGAR = "renting-or-buying-a-hangar";
const PARTS_SELL = "selling-aircraft-parts";
const BUYING_CHECKLIST = "buying-a-used-aircraft";
const ANAC_LICENSE_PDF =
  "https://www.argentina.gob.ar/sites/default/files/nota_informativa_ndeg_60_-requisitos_para_cada_licencia.pdf";

export const NEW_GUIDES: GuideSeed[] = [
  {
    slug: COSTS,
    title: "Cuánto cuesta tener un avión: los gastos que nadie te cuenta",
    excerpt: "Hangar, seguro, inspecciones, combustible y la reserva para la recorrida: cómo armar tu presupuesto anual antes de comprar.",
    audience: "comprador",
    icon: "Calculator",
    metaDescription:
      "Los costos fijos y variables de tener un avión en Argentina y cómo calcular la reserva para la recorrida general del motor.",
    sections: [
      {
        heading: "El precio de compra es solo el principio",
        paragraphs: [
          "Al presupuesto anual hay que sumarle gastos fijos (que se pagan aunque no vueles) y variables (que dependen de las horas de vuelo). Conviene calcularlos antes de comprar, no después.",
        ],
      },
      {
        heading: "Gastos fijos",
        bullets: [
          "Hangar o plataforma.",
          "Seguro (responsabilidad civil y, si querés, casco).",
          "Inspección anual y mantenimiento calendario.",
          "Cuota del aeroclub, si corresponde.",
          "Actualización de cartas y bases de datos de aviónica.",
          "Imprevistos (conviene reservar un margen).",
        ],
      },
      {
        heading: "Gastos variables (por hora de vuelo)",
        bullets: [
          "Combustible (consumo por hora × precio del litro en tu zona).",
          "Aceite.",
          "Mantenimiento por horas (inspecciones periódicas, cambios de aceite y filtros).",
          "Tasas de aterrizaje y estacionamiento.",
          "Reserva para la recorrida del motor y de la hélice.",
        ],
      },
      {
        heading: "La reserva para la recorrida general",
        paragraphs: [
          "Cada motor tiene un TBO (tiempo recomendado entre recorridas) fijado por el fabricante.",
          "Para no llevarte una sorpresa, dividí el costo estimado de la recorrida por las horas de TBO: eso es lo que tenés que reservar por cada hora que volás.",
          "Por ejemplo: si una recorrida cuesta X y el TBO es de 2.000 h, reservás X/2.000 por hora.",
          "Hacé lo mismo con la hélice. Pedí el presupuesto de recorrida a un taller habilitado.",
        ],
        links: [{ label: "Qué es el TBO", href: `${guidePath("aviation-glossary")}#tbo` }],
      },
      {
        heading: "Cómo armar tu número",
        bullets: [
          "Estimá cuántas horas por año vas a volar.",
          "Sumá los fijos anuales.",
          "Multiplicá el costo variable por hora por tus horas.",
          "Dividí el total por las horas para saber tu costo real por hora.",
          "Compará con alquilar en un aeroclub: si volás pocas horas, alquilar puede convenir.",
        ],
      },
      {
        heading: "Ideas para bajar costos",
        paragraphs: [
          "Copropiedad con otros pilotos (con un acuerdo escrito), hangar compartido, volar más horas (diluye los fijos) y elegir modelos con repuestos y mecánicos disponibles en tu zona.",
        ],
        links: [{ label: "Checklist para comprar un avión usado", href: guidePath(BUYING_CHECKLIST) }],
      },
    ],
    cta: [{ label: "Ver aeronaves en venta", href: "/planes" }],
  },
  {
    slug: FIRST,
    title: "Cómo elegir tu primer avión",
    excerpt: "Definí para qué lo vas a usar, cuánto podés gastar por año y qué tan fácil es mantenerlo en tu zona.",
    audience: "comprador",
    icon: "Compass",
    metaDescription:
      "Qué tener en cuenta para elegir tu primer avión: uso, cantidad de plazas, ala alta o baja, costos y disponibilidad de repuestos.",
    sections: [
      {
        heading: "Empezá por la misión, no por el modelo",
        bullets: [
          "¿Vuelos locales de fin de semana o viajes largos?",
          "¿Cuántas personas y cuánto equipaje?",
          "¿Desde qué tipo de pista (asfalto, tierra, pasto)?",
          "¿Vas a hacer horas para una licencia?",
        ],
      },
      {
        heading: "Plazas, velocidad y carga útil",
        paragraphs: [
          "Más plazas y más velocidad suelen significar más consumo, más mantenimiento y un seguro más caro. Revisá la carga útil real (con combustible y pasajeros), no solo la cantidad de asientos.",
        ],
      },
      {
        heading: "Ala alta o ala baja",
        bullets: [
          "Ala alta: visibilidad hacia abajo y sombra.",
          "Ala baja: visibilidad en virajes y, según el modelo, facilidad para cargar combustible.",
          "Acceso a la cabina.",
        ],
        paragraphs: ["No hay una mejor: depende del uso y del gusto del piloto. Lo que cambia entre una y otra:"],
      },
      {
        heading: "Tren fijo o retráctil, paso fijo o variable",
        paragraphs: [
          "Más complejidad mejora la performance, pero también suma mantenimiento y requiere habilitaciones o adaptación. Para un primer avión, lo simple suele ser lo más sensato.",
        ],
      },
      {
        heading: "Repuestos y mecánicos cerca",
        paragraphs: [
          "Antes de enamorarte de un modelo, averiguá si hay talleres que lo conozcan en tu zona y si los repuestos se consiguen. Un modelo popular es más fácil de mantener y de revender.",
        ],
      },
      {
        heading: "Presupuesto anual, no solo el precio",
        paragraphs: ["Lo que cuesta tenerlo volando pesa tanto como el precio de compra."],
        links: [{ label: "Cuánto cuesta tener un avión", href: guidePath(COSTS) }],
      },
      {
        heading: "Próximo paso",
        paragraphs: ["Cuando tengas un candidato, revisalo con el checklist de pre-compra."],
        links: [{ label: "Checklist de pre-compra", href: guidePath(BUYING_CHECKLIST) }],
      },
    ],
    cta: [{ label: "Explorar por tipo de aeronave", href: "/planes" }],
  },
  {
    slug: LICENSE,
    title: "Cómo sacar la licencia de piloto privado de avión en Argentina",
    excerpt: "Requisitos de edad, certificado médico, horas de vuelo y exámenes ante ANAC, explicados paso a paso.",
    audience: "todos",
    icon: "GraduationCap",
    metaDescription:
      "Requisitos de ANAC para la licencia de piloto privado de avión: edad, certificado médico, 40 horas de vuelo y exámenes.",
    source: {
      label: "ANAC, Nota informativa N° 60 / DLP: requisitos para cada licencia (RAAC Parte 61, Subparte E)",
      href: ANAC_LICENSE_PDF,
    },
    sections: [
      {
        heading: "Requisitos básicos",
        bullets: [
          "Tener 17 años.",
          "Certificado de estudios primarios o equivalente reconocido.",
          "Certificado médico aeronáutico Clase II vigente.",
        ],
      },
      {
        heading: "Horas de vuelo",
        bullets: [
          "40 horas de instrucción en total.",
          "De esas, al menos 30 en doble comando, 6 de travesía y 10 de vuelo solo (están incluidas en las 40).",
          "Los menores de 18 años necesitan autorización de padres o tutores, certificada por escribano o juez de paz, para volar solos.",
        ],
      },
      {
        heading: "Exámenes",
        bullets: [
          "Examen teórico ante ANAC (TCEXAM).",
          "Evaluación práctica: un formulario firmado y sellado por el inspector, el instructor y el aspirante, que se presenta ante ANAC.",
        ],
      },
      {
        heading: "Documentación para el trámite",
        bullets: [
          "Formulario de solicitud de ANAC.",
          "Foto 4×4.",
          "Copia del documento de identidad.",
          "Comprobante del pago del arancel.",
          "Libro de vuelo con la actividad firmada por el alumno, el instructor y el director de la escuela o aeroclub.",
        ],
      },
      {
        heading: "Dónde estudiar",
        paragraphs: [
          "En un aeroclub o una escuela de vuelo habilitada (CIAC). Compará la flota, la disponibilidad de instructores y de aviones, y la ubicación.",
        ],
      },
      {
        heading: "Antes de empezar",
        paragraphs: ["Consultá los requisitos vigentes en el sitio de ANAC, porque pueden cambiar."],
        links: [{ label: "Requisitos para cada licencia (ANAC)", href: ANAC_LICENSE_PDF }],
      },
    ],
    cta: [{ label: "Ver aviones de entrenamiento", href: "/planes?category=E" }],
  },
  {
    slug: PARTS_BUY,
    title: "Cómo comprar repuestos aeronáuticos sin riesgos",
    excerpt: "Número de parte, condición, trazabilidad y documentación: qué pedir antes de pagar un repuesto.",
    audience: "comprador",
    icon: "ShieldCheck",
    metaDescription:
      "Qué revisar al comprar repuestos de aviación: número de parte, condición (nuevo, overhauled, serviceable), trazabilidad y certificados.",
    sections: [
      {
        heading: "Empezá por el número de parte (P/N)",
        paragraphs: [
          "Confirmá en el catálogo de partes del fabricante o con tu taller el P/N exacto y sus alternativas aprobadas, y la aplicabilidad a tu número de serie.",
        ],
        links: [{ label: "Qué es el número de parte", href: `${guidePath("aviation-glossary")}#part-number` }],
      },
      {
        heading: "La condición del repuesto",
        paragraphs: ["Estas son las condiciones habituales del mercado. El precio y lo que se puede instalar dependen de esto:"],
        bullets: [
          "Nuevo (NE).",
          "Nuevo excedente (NS).",
          "Recorrido / overhauled (OH).",
          "Inspeccionado y apto / serviceable (SV).",
          "Tal como se desmontó / as removed (AR), que necesita inspección antes de instalarse.",
        ],
      },
      {
        heading: "Trazabilidad y documentación",
        paragraphs: [
          "Pedí la documentación que acredite el origen y la aptitud: certificado de conformidad o liberación (en piezas importadas son comunes el formulario FAA 8130-3 o el EASA Form 1) y el historial si es un componente con vida limitada (horas y ciclos). Sin papeles, un repuesto puede no ser instalable aunque esté impecable.",
        ],
      },
      {
        heading: "Señales de alerta",
        bullets: [
          "Precio muy por debajo del mercado.",
          "Vendedor que no muestra fotos de la placa de identificación o de los papeles.",
          "Placas ilegibles o adulteradas.",
          "Presión para pagar ya.",
          "Piezas \"como nuevas\" sin documentación.",
        ],
      },
      {
        heading: "La última palabra la tiene tu taller",
        paragraphs: ["Antes de comprar, consultá con el TAR que lo va a instalar si el repuesto y su documentación son aceptables."],
        links: [{ label: "Qué es un TAR", href: `${guidePath("aviation-glossary")}#tar` }],
      },
      {
        heading: "Al publicar un repuesto",
        paragraphs: ["Si vendés: P/N, condición, fotos de la placa y de la documentación. Esos avisos generan confianza y se venden antes."],
        links: [{ label: "Cómo publicar un repuesto que se venda", href: guidePath(PARTS_SELL) }],
      },
    ],
    cta: [{ label: "Ver repuestos", href: "/spareparts" }],
  },
  {
    slug: HANGAR,
    title: "Alquilar o comprar un hangar: qué mirar",
    excerpt: "Medidas de puerta, servicios en la pista, acceso y contrato: la lista para no equivocarte con el hangar.",
    audience: "todos",
    icon: "Warehouse",
    metaDescription:
      "Qué revisar antes de alquilar o comprar un hangar: medidas de la puerta, servicios del aeródromo, acceso, seguridad y contrato.",
    sections: [
      {
        heading: "Las medidas que importan",
        paragraphs: [
          "El ancho y el alto de la puerta definen qué entra; después, el fondo y el ancho interior. Compará con la envergadura, la altura en el timón y el largo de tu aeronave, dejando margen para maniobrar.",
        ],
      },
      {
        heading: "Hangar compartido, individual o plataforma",
        bullets: [
          "Compartido: suele costar menos, pero hay riesgo de golpes al mover otras aeronaves y el acceso depende de cómo estén ubicadas.",
          "Individual: más caro, con acceso libre y sin mover aeronaves ajenas.",
          "Plataforma: la opción más económica, con la aeronave a la intemperie.",
        ],
      },
      {
        heading: "La pista y sus servicios",
        bullets: [
          "Tipo y estado de la pista.",
          "Combustible disponible.",
          "Taller o escuela en el aeródromo.",
          "Iluminación.",
          "Distancia a tu casa.",
        ],
      },
      {
        heading: "Seguridad y acceso",
        bullets: ["Horarios y acceso 24 h.", "Vigilancia o cámaras.", "Quién más tiene llave.", "Qué cubre el seguro."],
      },
      {
        heading: "El contrato",
        bullets: [
          "Plazo.",
          "Actualización del precio.",
          "Qué incluye (electricidad, limpieza).",
          "Responsabilidad por daños.",
          "Preaviso para dejarlo.",
          "Si está permitido hacer mantenimiento adentro.",
        ],
      },
      {
        heading: "Si comprás",
        paragraphs: [
          "Verificá la situación del terreno y la concesión o permiso de uso dentro del aeródromo antes de pagar, con asesoramiento profesional.",
        ],
      },
    ],
    // Cuando exista /services/hangars (VA-84), el CTA tiene que apuntar ahí.
    cta: [{ label: "Ver hangares disponibles", href: "/services" }],
  },
  {
    slug: PARTS_SELL,
    title: "Cómo publicar un repuesto que se venda",
    excerpt: "Número de parte, condición clara, buenas fotos y documentación: lo que hace que un comprador te escriba.",
    audience: "vendedor",
    icon: "Tag",
    metaDescription:
      "Consejos para vender repuestos aeronáuticos: número de parte, condición, fotos de la placa y documentación en el aviso.",
    sections: [
      {
        heading: "Título con P/N y aplicación",
        paragraphs: ["Por ejemplo \"Magneto Slick 4371 — Lycoming O-320\", en vez de \"Magneto en buen estado\"."],
      },
      {
        heading: "Condición explicada",
        paragraphs: ["Usá las condiciones estándar y aclará las horas y ciclos si corresponde."],
        links: [{ label: "Las condiciones de un repuesto", href: guidePath(PARTS_BUY) }],
      },
      {
        heading: "Fotos que generan confianza",
        bullets: [
          "La pieza completa.",
          "La placa de identificación legible.",
          "Los detalles de desgaste.",
          "La documentación (podés tapar datos personales).",
        ],
      },
      {
        heading: "Documentación disponible",
        paragraphs: ["Indicá qué papeles tiene. Si no tiene, decilo: evita consultas perdidas y reclamos."],
      },
      {
        heading: "Precio y envío",
        paragraphs: ["Compará con avisos similares y aclará si hacés envíos y cómo embalás las piezas delicadas."],
        links: [{ label: "Ver repuestos publicados", href: "/spareparts" }],
      },
      {
        heading: "Respondé rápido",
        paragraphs: ["Las preguntas sin respuesta enfrían la venta."],
      },
    ],
    cta: [{ label: "Publicar un repuesto", href: "/publish" }],
  },
];
