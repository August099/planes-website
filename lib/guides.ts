import { BookOpen, ClipboardCheck, FileSignature, Tag, type LucideIcon } from "lucide-react";

// Guías para comprar y vender (VA-78). Contenido estático: se usa en /services/guides, /services/guides/[slug] y en la
// sección de la Home. Regla del contenido: no inventar trámites, costos, plazos ni normas; donde
// haga falta precisión, se remite a la fuente oficial.

export type GuideAudience = "comprador" | "vendedor" | "todos";

export type GuideLink = { label: string; href: string };

export type GuideSection = {
  heading: string;
  // Ancla (#id). En el glosario hay una por término (ej. #smoh).
  id?: string;
  paragraphs?: string[];
  bullets?: string[];
  links?: GuideLink[];
};

export type Guide = {
  slug: string;
  title: string;
  excerpt: string;
  audience: GuideAudience;
  icon: LucideIcon;
  readingMinutes: number;
  updatedAt: string; // AAAA-MM-DD
  metaDescription: string;
  sections: GuideSection[];
  // Fuente oficial citada con link visible (guía de transferencia).
  source?: GuideLink;
  cta?: GuideLink[];
  // El glosario se muestra como lista de definiciones y publica DefinedTermSet.
  isGlossary?: boolean;
};

export const GUIDE_DISCLAIMER =
  "Información general orientativa. No reemplaza el asesoramiento de un profesional ni de un taller habilitado.";

export const AUDIENCE_LABELS: Record<GuideAudience, string> = {
  comprador: "Para compradores",
  vendedor: "Para vendedores",
  todos: "Para todos",
};

const UPDATED_AT = "2026-10-09";
const ANAC_TRANSFER_URL = "https://www.argentina.gob.ar/tramites/transferencia-de-aeronaves-y-motores";

// Minutos de lectura a ~200 palabras por minuto (mínimo 1).
function readingMinutes(sections: GuideSection[]): number {
  const text = sections
    .flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.bullets ?? [])])
    .join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

type GuideInput = Omit<Guide, "readingMinutes" | "updatedAt">;
const guide = (g: GuideInput): Guide => ({ ...g, updatedAt: UPDATED_AT, readingMinutes: readingMinutes(g.sections) });

const TRANSFER_SLUG = "aircraft-transfer-anac";
const GLOSSARY_SLUG = "aviation-glossary";
const BUYING_SLUG = "buying-a-used-aircraft";
const SELLING_SLUG = "selling-your-aircraft";

// Las guías viven dentro de Servicios (cambio sobre VA-78, 9/10).
export const GUIDES_PATH = "/services/guides";
export const guidePath = (slug: string) => `${GUIDES_PATH}/${slug}`;

export const GUIDES: Guide[] = [
  guide({
    slug: BUYING_SLUG,
    title: "Cómo comprar un avión usado: checklist de pre-compra",
    excerpt: "Qué revisar antes de pagar: presupuesto real, documentación, inspección en un taller habilitado y señales de alerta.",
    audience: "comprador",
    icon: ClipboardCheck,
    metaDescription:
      "Checklist para comprar un avión usado en Argentina: presupuesto, documentación, inspección de pre-compra en un TAR, horas y señales de alerta.",
    sections: [
      {
        heading: "Definí el presupuesto total, no solo el precio",
        paragraphs: [
          "El precio del aviso es solo una parte. Antes de comparar aviones, armá un presupuesto que incluya lo que cuesta tenerlo y mantenerlo volando.",
        ],
        bullets: [
          "Seguro.",
          "Hangar.",
          "Anual e inspecciones.",
          "Una reserva para la próxima recorrida general del motor, según las horas que le queden hasta el TBO.",
        ],
        links: [{ label: "Qué es el TBO", href: `${guidePath(GLOSSARY_SLUG)}#tbo` }],
      },
      {
        heading: "Pedí y revisá la documentación",
        paragraphs: ["Pedile al vendedor la documentación completa y revisala antes de avanzar:"],
        bullets: [
          "Certificado de matrícula.",
          "Certificado de aeronavegabilidad vigente.",
          "Historiales (libros) de célula, motor y hélice, completos y coherentes entre sí.",
          "Cumplimiento de las directivas de aeronavegabilidad (AD).",
          "Certificado de dominio e inhibiciones del Registro Nacional de Aeronaves (ANAC), para confirmar quién es el titular y que no haya gravámenes.",
        ],
      },
      {
        heading: "Hacé una inspección de pre-compra",
        paragraphs: [
          "Hacela en un Taller Aeronáutico de Reparación (TAR) habilitado por ANAC e independiente del vendedor. Pedí que revise, como mínimo:",
        ],
        bullets: [
          "Compresión de cilindros.",
          "Boroscopía.",
          "Corrosión.",
          "Daños o reparaciones mayores.",
          "Estado de la aviónica.",
        ],
      },
      {
        heading: "Controlá que las horas coincidan",
        paragraphs: [
          "Las horas publicadas tienen que coincidir con las registradas en los historiales: tiempo total (TT) y horas desde la última recorrida general del motor (SMOH/DURG).",
        ],
        links: [{ label: "TT, SMOH y DURG en el glosario", href: `${guidePath(GLOSSARY_SLUG)}#smoh` }],
      },
      {
        heading: "Pedí un vuelo de prueba",
        paragraphs: ["Antes de cerrar, pedí volar el avión o verlo volar."],
      },
      {
        heading: "Señales de alerta",
        bullets: [
          "Historiales incompletos.",
          "Apuro para cerrar la operación.",
          "Precio muy por debajo del mercado.",
          "Pedidos de pagar una seña sin haber visto el avión.",
        ],
      },
      {
        heading: "El cierre",
        paragraphs: ["Cuando todo esté en orden, se firma el contrato y se hace la transferencia ante el Registro Nacional de Aeronaves."],
        links: [{ label: "Cómo es la transferencia ante ANAC", href: guidePath(TRANSFER_SLUG) }],
      },
    ],
    cta: [{ label: "Ver aeronaves en venta", href: "/planes" }],
  }),
  guide({
    slug: SELLING_SLUG,
    title: "Cómo vender tu avión más rápido",
    excerpt: "Fotos, datos completos, documentación lista y respuestas rápidas: lo que hace que un aviso reciba consultas serias.",
    audience: "vendedor",
    icon: Tag,
    metaDescription:
      "Consejos para vender tu avión más rápido: qué fotos subir, qué datos completar, qué documentación tener lista y cómo fijar el precio.",
    sections: [
      {
        heading: "Sacá buenas fotos",
        paragraphs: ["Con luz de día y el avión limpio. Mostrá:"],
        bullets: [
          "Los 4 lados del exterior.",
          "El panel completo.",
          "El interior.",
          "El motor con el capot abierto.",
          "La hélice.",
          "Los historiales.",
        ],
      },
      {
        heading: "Completá todos los datos del aviso",
        paragraphs: ["Los avisos completos generan más consultas serias. Incluí:"],
        bullets: [
          "Año.",
          "Tiempo total (TT).",
          "Horas desde la última recorrida general (SMOH/DURG).",
          "Hélice.",
          "Aviónica.",
          "Último anual o inspección.",
          "Si está en condiciones de vuelo.",
        ],
        links: [{ label: "Qué significa cada término", href: guidePath(GLOSSARY_SLUG) }],
      },
      {
        heading: "Tené la documentación lista y ordenada",
        paragraphs: [
          "Es la misma que va a pedir un comprador: certificados de matrícula y de aeronavegabilidad, historiales de célula, motor y hélice, cumplimiento de AD y certificado de dominio e inhibiciones.",
        ],
        links: [{ label: "Checklist del comprador", href: guidePath(BUYING_SLUG) }],
      },
      {
        heading: "Poné un precio realista",
        paragraphs: ["Compará con avisos similares de la web antes de publicar."],
        links: [{ label: "Ver aviones publicados", href: "/planes" }],
      },
      {
        heading: "Respondé rápido",
        paragraphs: ["Contestá las preguntas y los mensajes lo antes posible: un comprador interesado suele estar mirando varias opciones."],
      },
      {
        heading: "Al vender",
        paragraphs: [
          "Cualquiera de las partes puede hacer la denuncia digital de venta ante el Registro Nacional de Aeronaves dentro de los 30 días de firmado el contrato.",
        ],
        links: [{ label: "Transferencia de una aeronave (ANAC)", href: guidePath(TRANSFER_SLUG) }],
      },
    ],
    cta: [
      { label: "Publicar mi aeronave", href: "/publish" },
      { label: "Cómo publicar", href: "/howtopublish" },
    ],
  }),
  guide({
    slug: TRANSFER_SLUG,
    title: "Transferencia de una aeronave en Argentina (ANAC)",
    excerpt: "Qué pide el Registro Nacional de Aeronaves para transferir el dominio y cómo funciona la denuncia de venta.",
    audience: "todos",
    icon: FileSignature,
    metaDescription:
      "Requisitos para transferir una aeronave en Argentina ante el Registro Nacional de Aeronaves de ANAC y cómo funciona la denuncia digital de venta.",
    source: { label: "argentina.gob.ar — Transferencia de aeronaves y motores", href: ANAC_TRANSFER_URL },
    sections: [
      {
        heading: "Dónde se hace",
        paragraphs: ["La transferencia de dominio de aeronaves y motores se tramita ante el Registro Nacional de Aeronaves de la ANAC."],
      },
      {
        heading: "Requisitos",
        paragraphs: ["La página oficial del trámite lista:"],
        bullets: [
          "Solicitud de inscripción digital con domicilio legal constituido en Argentina (art. 48 del Código Aeronáutico).",
          "El título que acredita el derecho de dominio.",
          "Si corresponde, el asentimiento del cónyuge del vendedor (art. 470 del Código Civil y Comercial). Hay reglas especiales si el vendedor es divorciado.",
          "Declaración jurada digital de datos personales o societarios del solicitante.",
          "Certificado de Dominio y de Anotaciones Personales (Inhibición).",
          "Constancia de CUIT/CUIL/CDI.",
          "En el caso de aeronaves, la declaración del lugar de hangaraje.",
          "Si fueron emitidos en papel, los certificados de matrícula y de dominio del último titular.",
        ],
      },
      {
        heading: "Denuncia digital de venta",
        paragraphs: [
          "Es opcional. Cualquiera de las partes puede hacerla dentro de los 30 días de firmado el contrato.",
          "Si el comprador no pide la transferencia dentro de los 5 días de notificado, el Registro suspende de oficio la matriculación de la aeronave.",
        ],
      },
      {
        heading: "Aranceles y estado del trámite",
        paragraphs: ["Consultá aranceles y el estado del trámite en el sitio de ANAC."],
        links: [{ label: "Página oficial del trámite", href: ANAC_TRANSFER_URL }],
      },
      {
        heading: "¿Es tu primera vez?",
        paragraphs: ["Si no conocés el trámite, conviene hacerlo con un gestor o un escribano."],
      },
    ],
    cta: [{ label: "Ver aeronaves en venta", href: "/planes" }],
  }),
  guide({
    slug: GLOSSARY_SLUG,
    title: "Glosario: TT, SMOH, TBO y más",
    excerpt: "Las siglas y términos que vas a ver en los avisos de aeronaves, explicados en una o dos líneas.",
    audience: "todos",
    icon: BookOpen,
    isGlossary: true,
    metaDescription:
      "Qué significan TT, SMOH, DURG, TBO, SPOH, AD, TAR y otros términos que aparecen en los avisos de aeronaves.",
    sections: [
      { id: "ad", heading: "AD (directiva de aeronavegabilidad)", paragraphs: ["Disposición obligatoria que exige inspeccionar, reparar o modificar una aeronave, un motor o una pieza para corregir una condición insegura."] },
      { id: "ads-b", heading: "ADS-B", paragraphs: ["Sistema por el que la aeronave transmite su posición y otros datos para que la vean el control de tránsito aéreo y otras aeronaves equipadas. Ver también Transponder."] },
      { id: "annual", heading: "Anual / inspección anual", paragraphs: ["Inspección general periódica de la aeronave. En los avisos se informa como \"habilitado hasta\" o vencimiento del anual."] },
      { id: "ifr-certified", heading: "Apto IFR", paragraphs: ["Aeronave equipada y habilitada para volar por instrumentos (IFR), sin referencias visuales exteriores."] },
      { id: "borescope", heading: "Boroscopía", paragraphs: ["Inspección del interior del motor (por ejemplo, de los cilindros) con una cámara fina, sin desarmarlo."] },
      { id: "airframe", heading: "Célula", paragraphs: ["La estructura de la aeronave sin el motor ni la hélice: fuselaje, alas, empenaje y tren de aterrizaje."] },
      { id: "airworthiness-certificate", heading: "Certificado de aeronavegabilidad", paragraphs: ["Documento que acredita que la aeronave está en condiciones de volar con seguridad. Tiene que estar vigente."] },
      { id: "durg", heading: "DURG", paragraphs: ["Horas desde la última recorrida general del motor. Equivale a SMOH: en la web usamos los dos términos como sinónimos."] },
      { id: "elt", heading: "ELT", paragraphs: ["Transmisor localizador de emergencia: emite una señal para ubicar la aeronave en caso de accidente."] },
      { id: "logbooks", heading: "Historiales", paragraphs: ["Libros donde se registran las horas, inspecciones, reparaciones y modificaciones de la célula, el motor y la hélice."] },
      { id: "hp", heading: "HP (potencia)", paragraphs: ["Caballos de fuerza: la potencia del motor."] },
      { id: "registration", heading: "Matrícula", paragraphs: ["Identificación de la aeronave en el registro, pintada en el fuselaje."] },
      { id: "part-number", heading: "Número de parte (P/N)", paragraphs: ["Código con el que el fabricante identifica una pieza. Sirve para confirmar que un repuesto es el correcto."] },
      { id: "autopilot", heading: "Piloto automático (autopilot)", paragraphs: ["Sistema que mantiene el rumbo, la altitud o la ruta sin que el piloto mueva los comandos."] },
      { id: "overhaul", heading: "Recorrida general (overhaul)", paragraphs: ["Desarme, inspección y reacondicionamiento completo de un motor o una hélice. Después de la recorrida, sus horas \"desde recorrida\" vuelven a cero."] },
      { id: "sb", heading: "SB (boletín de servicio)", paragraphs: ["Recomendación del fabricante para inspeccionar, modificar o mejorar una aeronave, un motor o una pieza."] },
      { id: "smoh", heading: "SMOH", paragraphs: ["Horas del motor desde su última recorrida general (since major overhaul). Es lo mismo que DURG."] },
      { id: "spoh", heading: "SPOH", paragraphs: ["Horas de la hélice desde su última recorrida general."] },
      { id: "tar", heading: "TAR (Taller Aeronáutico de Reparación)", paragraphs: ["Taller habilitado por ANAC para hacer mantenimiento, inspecciones y reparaciones de aeronaves."] },
      { id: "tbo", heading: "TBO", paragraphs: ["Tiempo recomendado por el fabricante entre recorridas generales del motor o la hélice. Cuantas menos horas le queden al motor hasta el TBO, más cerca está la próxima recorrida."] },
      { id: "transponder", heading: "Transponder", paragraphs: ["Equipo que responde a las interrogaciones del radar e informa la identificación y la altitud de la aeronave. Ver también ADS-B."] },
      { id: "tsn", heading: "TSN", paragraphs: ["Tiempo desde nuevo: las horas acumuladas desde que el motor, la hélice o la pieza se fabricó."] },
      { id: "tt", heading: "TT / TTAF", paragraphs: ["Tiempo total de la célula: todas las horas que voló la aeronave desde nueva (total time airframe)."] },
    ],
    cta: [{ label: "Ver aeronaves en venta", href: "/planes" }],
  }),
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

// "2026-10-09" → "09/10/2026"
export function formatGuideDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
