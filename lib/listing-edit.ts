import "server-only";
import { prisma } from "@/lib/prisma";
import { assertListingOwner } from "@/lib/listing-auth";
import type { EditListingData } from "@/lib/listing-schema";

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/**
 * Carga una publicación para editarla con el formulario de publicar.
 * Devuelve null si no existe o si el usuario no es el dueño (ni admin).
 */
export async function loadListingForEdit(id: string, type: "aircraft" | "parts"): Promise<EditListingData | null> {
  try {
    await assertListingOwner(id, type === "aircraft" ? "aircraft" : "sparepart");
  } catch {
    return null;
  }

  if (type === "aircraft") {
    const a = await prisma.aircraft.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: "asc" } },
        documents: true,
        engines: true,
        propeller: true,
      },
    });
    if (!a) return null;

    return {
      id: a.id,
      type: "aircraft",
      images: a.images.map((i) => i.url),
      documents: a.documents.map((d) => ({ name: d.name, url: d.url })),
      aircraft: {
        title: a.title,
        year: a.year,
        condition: a.condition,
        price: str(a.price),
        priceOnRequest: a.price === null,
        brandId: a.brandId ?? (a.customBrand ? "CUSTOM" : ""),
        customBrand: a.customBrand ?? "",
        modelId: a.modelId ?? (a.customModel ? "CUSTOM_MODEL" : ""),
        subModelId: a.subModelId ?? "",
        customModel: a.customModel ?? "",
        categoryId: a.categoryId,
        engineType: a.engineType ?? "PISTON",
        totalTimeHours: str(a.totalTimeHours),
        financing: a.financing,
        trade: a.trade,
        rent: a.rent,
        avDescription: a.avDescription,
        avAaptoifr: a.avAaptoifr,
        avAutopilot: a.avAutopilot,
        certified: a.certified,
        certDate: isoDate(a.certDate),
        plate: a.plate ?? "",
        city: a.city,
        province: a.province,
        intDescription: a.intDescription ?? "",
        passengers: str(a.passengers),
        airconditioner: a.airconditioner,
        oxygen: a.oxygen,
        extDescription: a.extDescription ?? "",
        description: a.description,
      },
      engines: a.engines.map((e) => ({
        brand: e.brand ?? "",
        model: e.model ?? "",
        engineHours: str(e.engineHours),
        TBO: str(e.TBO),
        DURG: str(e.DURG),
        description: e.description ?? "",
      })),
      // La marca de la hélice hoy se guarda dentro del modelo (VA-54).
      propellers: a.propeller.map((p) => ({
        brand: "",
        model: p.model ?? "",
        propellerHours: str(p.propellerHours),
        description: p.description ?? "",
      })),
    };
  }

  const s = await prisma.sparePart.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      category: { include: { parent: { include: { parent: true } } } },
    },
  });
  if (!s) return null;

  // La categoría guardada es la más específica: hay que reconstruir Categoría > Subcategoría.
  const grandparent = s.category.parent?.parent;
  const parentCategoryId = grandparent ? grandparent.id : s.category.parent?.id ?? s.categoryId;
  const subCategoryId = grandparent ? s.category.parent!.id : s.category.parent ? s.categoryId : "";

  return {
    id: s.id,
    type: "parts",
    images: s.images.map((i) => i.url),
    documents: [],
    parts: {
      title: s.title,
      brand: s.brand ?? "",
      price: str(s.price),
      inPesos: s.inPesos,
      priceOnRequest: s.price === null,
      condition: s.condition,
      city: s.city,
      province: s.province,
      description: s.description,
      partNumber: s.partNumber ?? "",
      stock: str(s.stock),
      categoryId: s.categoryId,
      parentCategoryId,
      subCategoryId,
      aircrafts: s.aircrafts,
    },
  };
}
