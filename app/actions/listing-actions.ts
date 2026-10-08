"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AircraftStatus, SparePartStatus, SparepartCondition, AircraftCondition, EngineType, Prisma } from "@prisma/client";
import { assertListingOwner } from "@/lib/listing-auth";

// Traduce los errores de assertListingOwner a un mensaje para el usuario.
function listingAuthError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED") return "Tenés que iniciar sesión.";
  if (message === "FORBIDDEN") return "No tenés permiso para modificar esta publicación.";
  if (message === "NOT_FOUND") return "La publicación no existe.";
  return null;
}

// Número opcional: null si viene vacío, NaN si no es un número válido.
function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (value === null || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

// ==========================================
// 1. CREAR AIRCRAFT (Aeronave)
// ==========================================
export async function createAircraft(data: any) {
  try {
    const {
      sellerId,
      title,
      customBrand,
      brandId,
      modelId,
      subModelId,
      customModel,
      categoryId,
      year,
      totalTimeHours,
      price,
      city,
      province,
      description,
      condition,
      engineType,
      financing,
      trade,
      rent,
      avDescription,
      avAaptoifr,
      avAutopilot,
      certified,
      certDate,
      plate,
      intDescription,
      extDescription,
      passengers,
      airconditioner,
      oxygen,
      engines,
      propellers,
      images,
      documents,
    } = data;

    // FECHAS DE VENCIMIENTO (45 días exactos)
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(now.getDate() + 45);

    const newAircraft = await prisma.aircraft.create({
      data: {
        sellerId,
        title,
        customBrand: customBrand || undefined,
        brandId: brandId || undefined,
        modelId: modelId || undefined,
        subModelId: subModelId || undefined,
        customModel: customModel || undefined,
        categoryId,
        year: Number(year),
        totalTimeHours: Number(totalTimeHours),
        price: price ? Number(price) : null,
        city,
        province,
        description,
        condition: (condition as AircraftCondition) || "USADO",
        engineType: engineType || undefined,
        financing: Boolean(financing),
        trade: Boolean(trade),
        rent: Boolean(rent),
        avDescription: avDescription || undefined,
        avAaptoifr: Boolean(avAaptoifr),
        avAutopilot: Boolean(avAutopilot),
        certified: Boolean(certified),
        certDate: certDate ? new Date(certDate) : undefined,
        plate: plate || undefined,
        intDescription: intDescription || undefined,
        extDescription: extDescription || undefined,
        passengers: passengers ? Number(passengers) : undefined,
        airconditioner: Boolean(airconditioner),
        oxygen: Boolean(oxygen),
        status: AircraftStatus.ACTIVE,
        listingStartsAt: now,
        listingExpiresAt: expiresAt,
        engines: {
          create: engines?.map((engine: any) => ({
            engineHours: engine.engineHours ? Number(engine.engineHours) : undefined,
            TBO: Number(engine.TBO),
            DURG: engine.DURG ? Number(engine.DURG) : undefined,
            brand: engine.brand || undefined,
            model: engine.model || undefined,
            description: engine.description || undefined,
          })),
        },
        propeller: {
          create: propellers?.map((prop: any) => ({
            propellerHours: prop.propellerHours ? Number(prop.propellerHours) : undefined,
            model: prop.model || undefined,
            description: prop.description || undefined,
          })),
        },
        images: {
          create: images?.map((img: any, index: number) => ({
            url: img.url,
            order: index,
          })),
        },
        documents: {
          create: documents?.map((doc: any) => ({
            url: doc.url,
            name: doc.name,
          })),
        },
      },
    });

    revalidatePath("/profile");
    revalidatePath("/planes");

    return { success: true, data: newAircraft };
  } catch (error) {
    console.error("Error al crear aeronave:", error);
    return { success: false, error: "No se pudo crear la publicación." };
  }
}

// ==========================================
// 2. CREAR SPARE PART (Repuesto)
// ==========================================
export async function createSparePart(data: any) {
  try {
    const {
      sellerId,
      title,
      brand,
      partNumber,
      price,
      inPesos,
      condition,
      city,
      province,
      description,
      stock,
      categoryId,
      attributes,
      aircrafts,
      images,
    } = data;

    // FECHAS DE VENCIMIENTO (45 días exactos)
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(now.getDate() + 45);

    const conditionRaw = condition || "NUEVO";
    const spareCondition = (Object.values(SparepartCondition).includes(conditionRaw as SparepartCondition)
      ? conditionRaw
      : SparepartCondition.NUEVO) as SparepartCondition;

    const newSparePart = await prisma.sparePart.create({
      data: {
        sellerId,
        title,
        brand: brand || undefined,
        partNumber: partNumber || undefined,
        price: price ? Number(price) : null,
        inPesos: Boolean(inPesos),
        condition: spareCondition,
        city,
        province,
        description,
        stock: stock ? Number(stock) : 1,
        categoryId,
        attributes: attributes || {},
        aircrafts: aircrafts && aircrafts.length > 0 ? aircrafts : undefined,
        status: SparePartStatus.ACTIVE,
        listingStartsAt: now,
        listingExpiresAt: expiresAt,
        images: {
          create: images?.map((img: any, index: number) => ({
            url: img.url,
            order: index,
          })),
        },
      },
    });

    revalidatePath("/profile");
    revalidatePath("/spareparts");

    return { success: true, data: newSparePart };
  } catch (error) {
    console.error("Error al crear repuesto:", error);
    return { success: false, error: "No se pudo crear la publicación de repuesto." };
  }
}

// ==========================================
// 3. OBTENER PUBLICACIONES DE UN USUARIO
// ==========================================
export async function getUserListings(userId: string) {
  try {
    const [aircrafts, spareParts] = await Promise.all([
      prisma.aircraft.findMany({
        where: { sellerId: userId },
        include: {
          images: { orderBy: { order: "asc" }, take: 1 },
          category: true,
          brand: true,
          model: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sparePart.findMany({
        where: { sellerId: userId },
        include: {
          images: { orderBy: { order: "asc" }, take: 1 },
          category: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { success: true, aircrafts, spareParts };
  } catch (error) {
    console.error("Error al obtener publicaciones del usuario:", error);
    return { success: false, aircrafts: [], spareParts: [] };
  }
}

// ==========================================
// 4. OBTENER DETALLES PARA EDICIÓN / VISTA
// ==========================================
export async function getListingDetails(id: string, type: "AIRCRAFT" | "SPARE_PART") {
  try {
    if (type === "AIRCRAFT") {
      const aircraft = await prisma.aircraft.findUnique({
        where: { id },
        include: {
          images: { orderBy: { order: "asc" } },
          engines: true,
          propeller: true,
          documents: true,
          brand: true,
          model: true,
          subModel: true,
          category: true,
        },
      });
      return { success: true, data: aircraft };
    } else {
      const sparePart = await prisma.sparePart.findUnique({
        where: { id },
        include: {
          images: { orderBy: { order: "asc" } },
          category: true,
        },
      });
      return { success: true, data: sparePart };
    }
  } catch (error) {
    console.error("Error al obtener detalles del anuncio:", error);
    return { success: false, error: "No se pudo cargar la información." };
  }
}

// ==========================================
// 5. RENOVAR / EXTENDER PUBLICACIÓN (+45 DÍAS)
// ==========================================
export async function renewListingAction(id: string, type: "aircraft" | "sparepart") {
  try {
    await assertListingOwner(id, type);

    const now = new Date();

    if (type === "aircraft") {
      const current = await prisma.aircraft.findUnique({
        where: { id },
        select: { listingExpiresAt: true },
      });

      const baseDate = current?.listingExpiresAt && new Date(current.listingExpiresAt) > now
        ? new Date(current.listingExpiresAt)
        : now;

      const newExpiration = new Date(baseDate);
      newExpiration.setDate(baseDate.getDate() + 45);

      await prisma.aircraft.update({
        where: { id },
        data: {
          status: "ACTIVE",
          listingStartsAt: now,
          listingExpiresAt: newExpiration,
        },
      });

      revalidatePath("/planes");
      revalidatePath(`/planes/plane-details/${id}`);
    } else {
      const current = await prisma.sparePart.findUnique({
        where: { id },
        select: { listingExpiresAt: true },
      });

      const baseDate = current?.listingExpiresAt && new Date(current.listingExpiresAt) > now
        ? new Date(current.listingExpiresAt)
        : now;

      const newExpiration = new Date(baseDate);
      newExpiration.setDate(baseDate.getDate() + 45);

      await prisma.sparePart.update({
        where: { id },
        data: {
          status: "ACTIVE",
          listingStartsAt: now,
          listingExpiresAt: newExpiration,
        },
      });

      revalidatePath("/spareparts");
      revalidatePath(`/spareparts/sparepart-details/${id}`);
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    const authError = listingAuthError(error);
    if (authError) return { success: false, error: authError };
    console.error("Error al renovar publicación:", error);
    return { success: false, error: "No se pudo renovar la publicación." };
  }
}

// ==========================================
// 6. ELIMINAR PUBLICACIÓN
// ==========================================
export async function deleteListingAction(id: string, type: "AIRCRAFT" | "SPARE_PART") {
  try {
    await assertListingOwner(id, type === "AIRCRAFT" ? "aircraft" : "sparepart");

    if (type === "AIRCRAFT") {
      await prisma.aircraft.delete({ where: { id } });
    } else {
      await prisma.sparePart.delete({ where: { id } });
    }

    revalidatePath("/profile");
    revalidatePath("/planes");
    revalidatePath("/spareparts");

    return { success: true };
  } catch (error) {
    const authError = listingAuthError(error);
    if (authError) return { success: false, error: authError };
    console.error("Error al eliminar publicación:", error);
    return { success: false, error: "No se pudo eliminar la publicación." };
  }
}

// ==========================================
// 7. ACTUALIZAR PUBLICACIÓN (Edición Completa)
// ==========================================
export async function updateListingAction(formData: FormData) {
  try {
    const id = formData.get("id") as string;
    const listingType = formData.get("listingType") as "aircraft" | "sparepart";

    if (!id) {
      return { success: false, error: "Datos incompletos" };
    }
    if (listingType !== "aircraft" && listingType !== "sparepart") {
      return { success: false, error: "Tipo de publicación inválido." };
    }

    await assertListingOwner(id, listingType);

    // Solo se actualizan los campos que vienen en el formulario: lo que no se envía
    // queda como está en la base (antes se pisaba con valores por defecto).
    const has = (name: string) => formData.has(name);
    const text = (name: string) => String(formData.get(name) ?? "").trim();
    const bool = (name: string) => formData.get(name) === "true" || formData.get(name) === "on";

    const common: {
      title?: string;
      description?: string;
      city?: string;
      province?: string;
      price?: number | null;
    } = {};

    if (has("title")) {
      if (!text("title")) return { success: false, error: "El título es obligatorio." };
      common.title = text("title");
    }
    if (has("description")) common.description = text("description");
    for (const field of ["city", "province"] as const) {
      if (has(field)) {
        if (!text(field)) return { success: false, error: "La ciudad y la provincia son obligatorias." };
        common[field] = text(field);
      }
    }

    if (formData.get("priceOnRequest") === "true") {
      common.price = null;
    } else if (has("price")) {
      const price = parseOptionalNumber(formData.get("price"));
      if (price !== null && (Number.isNaN(price) || price < 0)) {
        return { success: false, error: "El precio debe ser un número mayor o igual a 0." };
      }
      common.price = price;
    }

    if (listingType === "aircraft") {
      const data: Prisma.AircraftUpdateInput = { ...common };

      if (has("year")) {
        const year = Number(formData.get("year"));
        const maxYear = new Date().getFullYear() + 1;
        if (!Number.isInteger(year) || year < 1900 || year > maxYear) {
          return { success: false, error: `El año debe estar entre 1900 y ${maxYear}.` };
        }
        data.year = year;
      }

      if (has("totalTimeHours")) {
        const totalTimeHours = parseOptionalNumber(formData.get("totalTimeHours")) ?? 0;
        if (!Number.isInteger(totalTimeHours) || totalTimeHours < 0) {
          return { success: false, error: "Las horas totales deben ser un número entero mayor o igual a 0." };
        }
        data.totalTimeHours = totalTimeHours;
      }

      if (has("condition")) {
        const condition = text("condition");
        if (!Object.values(AircraftCondition).includes(condition as AircraftCondition)) {
          return { success: false, error: "Condición inválida." };
        }
        data.condition = condition as AircraftCondition;
      }

      if (has("engineType")) {
        const engineType = text("engineType");
        if (engineType && !Object.values(EngineType).includes(engineType as EngineType)) {
          return { success: false, error: "Tipo de motor inválido." };
        }
        data.engineType = (engineType as EngineType) || null;
      }

      if (has("passengers")) {
        const passengers = parseOptionalNumber(formData.get("passengers"));
        if (passengers !== null && (!Number.isInteger(passengers) || passengers < 0)) {
          return { success: false, error: "La cantidad de pasajeros debe ser un número entero." };
        }
        data.passengers = passengers;
      }

      if (has("certDate")) {
        const certDateRaw = text("certDate");
        const certDate = certDateRaw ? new Date(certDateRaw) : null;
        if (certDate && Number.isNaN(certDate.getTime())) {
          return { success: false, error: "Fecha de certificación inválida." };
        }
        data.certDate = certDate;
      }

      if (has("avDescription")) data.avDescription = text("avDescription");
      for (const field of ["plate", "intDescription", "extDescription"] as const) {
        if (has(field)) data[field] = text(field) || null;
      }
      for (const field of [
        "financing",
        "trade",
        "rent",
        "avAaptoifr",
        "avAutopilot",
        "certified",
        "airconditioner",
        "oxygen",
      ] as const) {
        if (has(field)) data[field] = bool(field);
      }

      await prisma.aircraft.update({ where: { id }, data });

      revalidatePath("/planes");
      revalidatePath(`/planes/plane-details/${id}`);
    } else {
      const data: Prisma.SparePartUpdateInput = { ...common };

      if (has("stock")) {
        const stock = parseOptionalNumber(formData.get("stock")) ?? 1;
        if (!Number.isInteger(stock) || stock < 1) {
          return { success: false, error: "El stock debe ser un número entero mayor o igual a 1." };
        }
        data.stock = stock;
      }

      if (has("condition")) {
        const condition = text("condition");
        if (!Object.values(SparepartCondition).includes(condition as SparepartCondition)) {
          return { success: false, error: "Condición inválida." };
        }
        data.condition = condition as SparepartCondition;
      }

      if (has("brand")) data.brand = text("brand") || null;
      if (has("partNumber")) data.partNumber = text("partNumber") || null;
      if (has("inPesos")) data.inPesos = bool("inPesos");

      if (has("aircrafts")) {
        try {
          const aircrafts: unknown = JSON.parse(text("aircrafts") || "[]");
          if (!Array.isArray(aircrafts) || !aircrafts.every((a) => typeof a === "string")) {
            throw new Error();
          }
          data.aircrafts = aircrafts;
        } catch {
          return { success: false, error: "Lista de aeronaves inválida." };
        }
      }

      await prisma.sparePart.update({ where: { id }, data });

      revalidatePath("/spareparts");
      revalidatePath(`/spareparts/sparepart-details/${id}`);
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    const authError = listingAuthError(error);
    if (authError) return { success: false, error: authError };
    console.error("Error al actualizar la publicación:", error);
    return { success: false, error: "No se pudo actualizar la publicación." };
  }
}
