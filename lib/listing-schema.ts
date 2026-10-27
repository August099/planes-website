import { z } from "zod";
import { youtubeId } from "@/lib/youtube";
import { isRequired, minEngines } from "@/lib/aircraft-rules";
import { normalizeProvince } from "@/lib/provinces";

// Esquema único de una publicación nueva: lo usan el formulario (PublishForm) y el
// servidor (createListing). Los números llegan como texto desde los inputs.

export const MAX_LISTING_IMAGES = 15;
export const MAX_LISTING_DOCUMENTS = 10;
export const MAX_ENGINES = 4;
// Tope de la descripción (VA-53). En va_dev la más larga tenía 365 caracteres.
export const MAX_DESCRIPTION_LENGTH = 2000;

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

// Vacío → undefined (campo sin cargar); texto → número (NaN si no es numérico).
// Así se distingue "obligatorio" de "tiene que ser un número".
const toNumber = (value: unknown) => {
  const v = emptyToUndefined(value);
  return typeof v === "string" ? Number(v.trim()) : v;
};

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`);
// "required" es el mensaje completo (cuida el género: "La ciudad es obligatoria").
const requiredText = (required: string, max: number) => text(max).min(1, required);
const optionalText = (max: number) => text(max).optional().default("");

// "label" es el sujeto del mensaje ("El año", "Las horas totales"); los mensajes
// se arman para que concuerden ("tiene/tienen que ser...").
const number = (label: string, required?: string) =>
  z.number({
    error: (issue) => (issue.input === undefined && required ? required : `${label}: tiene que ser un número.`),
  });

const optionalInt = (label: string) =>
  z.preprocess(
    toNumber,
    number(label).int(`${label}: tiene que ser un número entero.`).min(0, `${label}: no puede ser negativo.`).optional()
  );

const requiredInt = (label: string, required: string, min = 0) =>
  z.preprocess(
    toNumber,
    number(label, required)
      .int(`${label}: tiene que ser un número entero.`)
      .min(min, min === 0 ? `${label}: no puede ser negativo.` : `${label}: tiene que ser al menos ${min}.`)
  );

const price = z.preprocess(
  toNumber,
  z.number({ error: "El precio tiene que ser un número." }).positive("El precio tiene que ser mayor a 0.").optional()
);

// Rutas dentro del bucket, devueltas por prepareListingUploads (no URLs completas).
const storagePath = z.string().min(1).max(300);

const images = z
  .array(storagePath)
  .min(1, "Adjuntá al menos una imagen.")
  .max(MAX_LISTING_IMAGES, `Podés subir hasta ${MAX_LISTING_IMAGES} imágenes.`);

const documents = z
  .array(z.object({ path: storagePath, name: text(200).min(1) }))
  .max(MAX_LISTING_DOCUMENTS, `Podés adjuntar hasta ${MAX_LISTING_DOCUMENTS} documentos.`)
  .default([]);

const common = {
  title: requiredText("El título es obligatorio.", 150),
  priceOnRequest: z.boolean().default(false),
  price,
  city: requiredText("La ciudad es obligatoria.", 100),
  // VA-77: una de las 24 provincias canónicas. Un alias ("Bs. As.", "CABA") se guarda normalizado.
  province: requiredText("La provincia es obligatoria.", 100).transform((value, ctx) => {
    const canonical = normalizeProvince(value);
    if (!canonical) {
      ctx.addIssue({ code: "custom", message: "Elegí una provincia de la lista." });
      return z.NEVER;
    }
    return canonical;
  }),
  description: requiredText("La descripción es obligatoria.", MAX_DESCRIPTION_LENGTH),
  images,
  // VA-170: link a un video de YouTube (detalles personalizados del Broker). Solo el texto.
  youtubeUrl: optionalText(100).refine((v) => !v || youtubeId(v) !== null, "Pegá un link de YouTube (youtube.com/watch, youtu.be o /shorts)."),
};

const engine = z.object({
  brand: optionalText(100),
  model: optionalText(100),
  engineHours: optionalInt("Horas del motor"),
  TBO: optionalInt("TBO"),
  horsepower: optionalInt("Potencia"),
  description: optionalText(500),
});

const propeller = z.object({
  brand: optionalText(100),
  model: optionalText(100),
  propellerHours: optionalInt("Horas de la hélice"),
  description: optionalText(500),
});

export const aircraftListingSchema = z
  .object({
    listingType: z.literal("aircraft"),
    ...common,
    year: requiredInt("Año", "El año es obligatorio.", 1900).refine((y) => y <= new Date().getFullYear(), "El año no puede ser futuro."),
    condition: z.enum(["USADO", "NUEVO"]).default("USADO"),
    brandId: optionalText(50),
    customBrand: optionalText(100),
    modelId: optionalText(50),
    subModelId: optionalText(50),
    customModel: optionalText(100),
    categoryId: requiredText("Seleccioná una categoría.", 20),
    totalTimeHours: optionalInt("Horas totales"),
    financing: z.boolean().default(false),
    trade: z.boolean().default(false),
    rent: z.boolean().default(false),
    negotiable: z.boolean().default(false),
    extraEquipment: optionalText(2000),
    // Solo para Agrícola: en otras categorías el servidor lo descarta.
    agEquipment: optionalText(2000),
    avDescription: optionalText(2000),
    avAaptoifr: z.boolean().default(false),
    avAutopilot: z.boolean().default(false),
    certified: z.boolean({ error: "Indicá si la aeronave está habilitada (Sí o No)." }),
    certDate: z.preprocess(emptyToUndefined, z.iso.date("La fecha de habilitación no es válida.").optional()),
    plate: optionalText(20),
    intDescription: optionalText(2000),
    extDescription: optionalText(2000),
    passengers: optionalInt("Pasajeros"),
    airconditioner: z.boolean().default(false),
    oxygen: z.boolean().default(false),
    engines: z.array(engine).max(MAX_ENGINES, `Máximo ${MAX_ENGINES} motores.`).default([]),
    propellers: z.array(propeller).default([]),
    documents,
  })
  .superRefine((data, ctx) => {
    if (!data.priceOnRequest && data.price === undefined) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Ingresá el precio o marcá 'Precio a consultar'." });
    }
    if (!data.brandId && !data.customBrand) {
      ctx.addIssue({ code: "custom", path: ["brandId"], message: "Seleccioná o escribí la marca." });
    }
    if (!data.modelId && !data.customModel) {
      ctx.addIssue({ code: "custom", path: ["modelId"], message: "Seleccioná o escribí el modelo." });
    }
    if (data.condition === "NUEVO" && data.year !== new Date().getFullYear()) {
      ctx.addIssue({ code: "custom", path: ["condition"], message: "Solo una aeronave del año actual puede ser nueva." });
    }
    // VA-90 / VA-112: motores mínimos según la categoría (lib/aircraft-rules.ts), y un motor cargado tiene marca o modelo
    // (si no, una ficha vacía contaría como motor).
    const neededEngines = minEngines(data.categoryId);
    if (data.engines.length < neededEngines) {
      ctx.addIssue({
        code: "custom",
        path: ["engines"],
        message: neededEngines === 2 ? "Un bimotor necesita los dos motores." : "Agregá al menos un motor.",
      });
    }
    data.engines.forEach((engine, i) => {
      // 27/10: la marca del motor es obligatoria (antes alcanzaba con la marca o el modelo).
      if (!engine.brand) {
        ctx.addIssue({ code: "custom", path: ["engines", i, "brand"], message: "Completá la marca del motor." });
      }
    });
    if (data.propellers.length > data.engines.length) {
      ctx.addIssue({ code: "custom", path: ["propellers"], message: "No puede haber más hélices que motores." });
    }
    // VA-44: obligatorios según la categoría (lib/aircraft-rules.ts).
    if (data.totalTimeHours === undefined && isRequired("totalTimeHours", data.categoryId)) {
      ctx.addIssue({ code: "custom", path: ["totalTimeHours"], message: "Las horas totales son obligatorias." });
    }
    if (!data.avDescription && isRequired("avDescription", data.categoryId)) {
      ctx.addIssue({ code: "custom", path: ["avDescription"], message: "La descripción de aviónica es obligatoria." });
    }
    if (isRequired("TBO", data.categoryId)) {
      data.engines.forEach((engine, i) => {
        if (engine.TBO === undefined) {
          ctx.addIssue({ code: "custom", path: ["engines", i, "TBO"], message: "El TBO del motor es obligatorio." });
        }
      });
    }
  });

export const sparePartListingSchema = z
  .object({
    listingType: z.literal("parts"),
    ...common,
    brand: optionalText(100),
    partNumber: optionalText(100),
    inPesos: z.boolean().default(false),
    condition: z.enum(["NUEVO", "USADO", "RECORRIDO", "REPARAR"]).default("NUEVO"),
    stock: requiredInt("Stock", "El stock es obligatorio.", 1),
    categoryId: requiredText("Seleccioná la categoría más específica.", 50),
    aircrafts: z.array(text(150)).max(50, "Máximo 50 aeronaves compatibles.").default([]),
  })
  .superRefine((data, ctx) => {
    if (!data.priceOnRequest && data.price === undefined) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Ingresá el precio o marcá 'Precio a consultar'." });
    }
  });

export const listingSchema = z.discriminatedUnion("listingType", [aircraftListingSchema, sparePartListingSchema]);

export type ListingInput = z.input<typeof listingSchema>;
export type AircraftListing = z.output<typeof aircraftListingSchema>;
export type SparePartListing = z.output<typeof sparePartListingSchema>;
export type ListingData = z.output<typeof listingSchema>;

export type FieldErrors = Record<string, string>;

// Un mensaje por campo ("engines.0.TBO", "price", ...), el primero que aparezca.
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type ListingResult =
  // VA-152: paused si se guardó pausado porque no quedaba cupo (lo pidió el usuario).
  | { ok: true; id: string; url: string; paused?: boolean; founder?: { until: string } }
  // VA-152: quotaFull si no hay cupo y no eligió "Guardar como pausado".
  | { ok: false; error: string; fieldErrors?: FieldErrors; quotaFull?: boolean };

// Publicación existente cargada en el formulario para editarla (/publish?edit=<id>).
// Los valores van como los maneja el formulario (números como texto).
export interface EditListingData {
  id: string;
  type: "aircraft" | "parts";
  images: string[];
  documents: { name: string; url: string }[];
  aircraft?: {
    title: string;
    year: number;
    condition: "USADO" | "NUEVO";
    price: string;
    priceOnRequest: boolean;
    brandId: string;
    customBrand: string;
    modelId: string;
    subModelId: string;
    customModel: string;
    categoryId: string;
    totalTimeHours: string;
    financing: boolean;
    trade: boolean;
    rent: boolean;
    negotiable: boolean;
    extraEquipment: string;
    agEquipment: string;
    avDescription: string;
    avAaptoifr: boolean;
    avAutopilot: boolean;
    certified: boolean | null;
    certDate: string;
    plate: string;
    youtubeUrl?: string;
    city: string;
    province: string;
    intDescription: string;
    passengers: string;
    airconditioner: boolean;
    oxygen: boolean;
    extDescription: string;
    description: string;
  };
  engines?: { brand: string; model: string; engineHours: string; TBO: string; horsepower: string; description: string }[];
  propellers?: { brand: string; model: string; propellerHours: string; description: string }[];
  parts?: {
    title: string;
    brand: string;
    price: string;
    inPesos: boolean;
    priceOnRequest: boolean;
    condition: string;
    city: string;
    province: string;
    description: string;
    partNumber: string;
    stock: string;
    categoryId: string;
    parentCategoryId: string;
    subCategoryId: string;
    aircrafts: string[];
    youtubeUrl?: string;
  };
}
