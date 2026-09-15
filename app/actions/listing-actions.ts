"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AircraftStatus, SparePartStatus } from "@prisma/client";

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
        customBrand: customBrand || null,
        brandId: brandId || null,
        modelId: modelId || null,
        subModelId: subModelId || null,
        customModel: customModel || null,
        categoryId,
        year: Number(year),
        totalTimeHours: Number(totalTimeHours),
        price: price ? Number(price) : null,
        city,
        province,
        description,
        condition,
        engineType: engineType || null,
        financing: Boolean(financing),
        trade: Boolean(trade),
        rent: Boolean(rent),
        status: AircraftStatus.ACTIVE,
        listingStartsAt: now,
        listingExpiresAt: expiresAt,
        engines: {
          create: engines?.map((engine: any) => ({
            engineHours: engine.engineHours ? Number(engine.engineHours) : null,
            TBO: Number(engine.TBO),
            brand: engine.brand || null,
            model: engine.model || null,
          })),
        },
        propeller: {
          create: propellers?.map((prop: any) => ({
            propellerHours: prop.propellerHours ? Number(prop.propellerHours) : null,
            model: prop.model || null,
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
    revalidatePath("/aircrafts");

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
      partNumber,
      price,
      inPesos,
      city,
      province,
      description,
      stock,
      categoryId,
      attributes,
      images,
    } = data;

    // FECHAS DE VENCIMIENTO (45 días exactos)
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(now.getDate() + 45);

    const newSparePart = await prisma.sparePart.create({
      data: {
        sellerId,
        title,
        partNumber: partNumber || null,
        price: price ? Number(price) : null,
        inPesos: Boolean(inPesos),
        city,
        province,
        description,
        stock: stock ? Number(stock) : 1,
        categoryId,
        attributes: attributes || {},
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
// RENOVAR / EXTENDER PUBLICACIÓN (+45 DÍAS)
// ==========================================
export async function renewListingAction(id: string, type: "aircraft" | "sparepart") {
  try {
    const now = new Date();

    if (type === "aircraft") {
      // 1. Buscar la publicación actual para conocer su vencimiento existente
      const current = await prisma.aircraft.findUnique({
        where: { id },
        select: { listingExpiresAt: true },
      });

      // 2. Si tiene una fecha futura válida, sumamos 45 días a esa fecha. Si ya venció o era null, sumamos desde 'now'.
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

      revalidatePath("/aircrafts");
      revalidatePath(`/aircrafts/${id}`);
    } else {
      // Repuestos
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
      revalidatePath(`/spareparts/${id}`);
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error al renovar publicación:", error);
    return { success: false, error: "No se pudo renovar la publicación." };
  }
}

// ==========================================
// 6. ELIMINAR PUBLICACIÓN
// ==========================================
export async function deleteListingAction(id: string, type: "AIRCRAFT" | "SPARE_PART") {
  try {
    if (type === "AIRCRAFT") {
      await prisma.aircraft.delete({ where: { id } });
    } else {
      await prisma.sparePart.delete({ where: { id } });
    }

    revalidatePath("/profile");
    revalidatePath("/aircrafts");
    revalidatePath("/spareparts");

    return { success: true };
  } catch (error) {
    console.error("Error al eliminar publicación:", error);
    return { success: false, error: "No se pudo eliminar la publicación." };
  }
}

// ==========================================
// 7. ACTUALIZAR PUBLICACIÓN (Edición rápida)
// ==========================================
export async function updateListingAction(formData: FormData) {
  try {
    const id = formData.get("id") as string;
    const listingType = formData.get("listingType") as "aircraft" | "sparepart";
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const city = formData.get("city") as string;
    const province = formData.get("province") as string;
    const priceOnRequest = formData.get("priceOnRequest") === "true";
    const priceInput = formData.get("price") as string;
    const price = priceOnRequest || !priceInput ? null : Number(priceInput);

    if (!id || !title) {
      return { success: false, error: "Datos incompletos" };
    }

    if (listingType === "aircraft") {
      const year = Number(formData.get("year"));
      const totalTimeHours = Number(formData.get("totalTimeHours"));
      const financing = formData.get("financing") === "on";
      const trade = formData.get("trade") === "on";
      const rent = formData.get("rent") === "on";

      await prisma.aircraft.update({
        where: { id },
        data: {
          title,
          description,
          city,
          province,
          price,
          year,
          totalTimeHours,
          financing,
          trade,
          rent,
        },
      });

      revalidatePath("/aircrafts");
      revalidatePath(`/aircrafts/${id}`);
    } else {
      const partNumber = formData.get("partNumber") as string;
      const stock = Number(formData.get("stock")) || 1;
      const inPesos = formData.get("inPesos") === "on";

      await prisma.sparePart.update({
        where: { id },
        data: {
          title,
          description,
          city,
          province,
          price,
          partNumber: partNumber || null,
          stock,
          inPesos,
        },
      });

      revalidatePath("/spareparts");
      revalidatePath(`/spareparts/${id}`);
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar la publicación:", error);
    return { success: false, error: "No se pudo actualizar la publicación." };
  }
}