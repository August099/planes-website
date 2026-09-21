"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AircraftStatus, SparePartStatus, SparepartCondition, AircraftCondition, EngineType } from "@prisma/client";

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
    revalidatePath("/planes");
    revalidatePath("/spareparts");

    return { success: true };
  } catch (error) {
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
      const condition = (formData.get("condition") as AircraftCondition) || "USADO";
      const engineType = (formData.get("engineType") as EngineType) || undefined;

      const financing = formData.get("financing") === "on" || formData.get("financing") === "true";
      const trade = formData.get("trade") === "on" || formData.get("trade") === "true";
      const rent = formData.get("rent") === "on" || formData.get("rent") === "true";

      const avDescription = formData.get("avDescription") as string;
      const avAaptoifr = formData.get("avAaptoifr") === "true" || formData.get("avAaptoifr") === "on";
      const avAutopilot = formData.get("avAutopilot") === "true" || formData.get("avAutopilot") === "on";
      const certified = formData.get("certified") === "true" || formData.get("certified") === "on";
      const certDateRaw = formData.get("certDate") as string;
      const certDate = certDateRaw ? new Date(certDateRaw) : undefined;
      const plate = formData.get("plate") as string;

      const intDescription = formData.get("intDescription") as string;
      const extDescription = formData.get("extDescription") as string;
      const passengersRaw = formData.get("passengers") as string;
      const passengers = passengersRaw ? Number(passengersRaw) : undefined;
      const airconditioner = formData.get("airconditioner") === "true" || formData.get("airconditioner") === "on";
      const oxygen = formData.get("oxygen") === "true" || formData.get("oxygen") === "on";

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
          condition,
          engineType,
          financing,
          trade,
          rent,
          avDescription: avDescription || undefined,
          avAaptoifr,
          avAutopilot,
          certified,
          certDate,
          plate: plate || undefined,
          intDescription: intDescription || undefined,
          extDescription: extDescription || undefined,
          passengers,
          airconditioner,
          oxygen,
        },
      });

      revalidatePath("/planes");
      revalidatePath(`/planes/plane-details/${id}`);
    } else {
      const brand = formData.get("brand") as string;
      const partNumber = formData.get("partNumber") as string;
      const stock = Number(formData.get("stock")) || 1;
      const inPesos = formData.get("inPesos") === "on" || formData.get("inPesos") === "true";

      const conditionRaw = (formData.get("condition") as string) || "NUEVO";
      const condition = (Object.values(SparepartCondition).includes(conditionRaw as SparepartCondition)
        ? conditionRaw
        : SparepartCondition.NUEVO) as SparepartCondition;

      const aircraftsRaw = formData.get("aircrafts") as string;
      let aircrafts: string[] | undefined = undefined;
      if (aircraftsRaw) {
        try {
          aircrafts = JSON.parse(aircraftsRaw);
        } catch {
          aircrafts = undefined;
        }
      }

      await prisma.sparePart.update({
        where: { id },
        data: {
          title,
          brand: brand || undefined,
          description,
          city,
          province,
          price,
          partNumber: partNumber || undefined,
          stock,
          inPesos,
          condition,
          aircrafts,
        },
      });

      revalidatePath("/spareparts");
      revalidatePath(`/spareparts/sparepart-details/${id}`);
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar la publicación:", error);
    return { success: false, error: "No se pudo actualizar la publicación." };
  }
}