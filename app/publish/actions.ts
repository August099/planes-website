"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { EMAIL_FROM, escapeHtml, getSupportEmail } from "@/lib/mail";
import { MAX_LISTING_IMAGES, validateDocument, validateImage, type DetectedFile } from "@/lib/upload-validation";
import { AircraftCondition, EngineType, SparepartCondition, AnalyticsEventType } from "@prisma/client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function createListing(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  // El formulario manda "aircraft" o "parts" (activeTab de PublishForm).
  const listingType = formData.get("listingType") === "parts" ? "parts" : "aircraft";

  // 1. Validar imágenes y documentos antes de subir nada
  const files = (formData.getAll("files") as File[]).filter((f) => f && f.size > 0);
  const documentFiles = (formData.getAll("documents") as File[]).filter((f) => f && f.size > 0);

  if (files.length > MAX_LISTING_IMAGES) {
    return { success: false, error: `Solo podés subir un máximo de ${MAX_LISTING_IMAGES} imágenes.` };
  }

  const images: { file: File; detected: DetectedFile }[] = [];
  for (const file of files) {
    const result = await validateImage(file);
    if (!result.ok) return { success: false, error: result.error };
    images.push({ file, detected: result.file });
  }

  const docs: { file: File; detected: DetectedFile }[] = [];
  for (const file of documentFiles) {
    const result = await validateDocument(file);
    if (!result.ok) return { success: false, error: result.error };
    docs.push({ file, detected: result.file });
  }

  // 2. Subida en paralelo a Supabase Storage (la extensión sale del tipo detectado, no del nombre)
  const randomName = (ext: string) =>
    `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  const imageResults = await Promise.all(
    images.map(async ({ file, detected }) => {
      const filePath = `${listingType}/${user.id}/${randomName(detected.ext)}`;
      const { error } = await supabase.storage
        .from("listings")
        .upload(filePath, file, { contentType: detected.contentType });

      if (error) {
        console.error("Error al subir imagen a Supabase:", error);
        return null;
      }
      return supabase.storage.from("listings").getPublicUrl(filePath).data?.publicUrl ?? null;
    })
  );
  // Promise.all mantiene el orden, así que la portada sigue siendo la primera imagen.
  const uploadedUrls = imageResults.filter((url): url is string => !!url);

  const docResults = await Promise.all(
    docs.map(async ({ file, detected }) => {
      const filePath = `${user.id}/${randomName(detected.ext)}`;
      const { error } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { contentType: detected.contentType });

      if (error) {
        console.error("Error al subir documento a Supabase:", error);
        return null;
      }
      const url = supabase.storage.from("documents").getPublicUrl(filePath).data?.publicUrl;
      return url ? { name: file.name, url } : null;
    })
  );
  const uploadedDocs = docResults.filter((doc): doc is { name: string; url: string } => !!doc);

  // Configuración de fechas de vigencia (+45 DÍAS)
  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(now.getDate() + 45);

  let redirectTarget = "";

  // 3. Guardado en la base de datos
  if (listingType === "aircraft") {
    const title = formData.get("title") as string;
    let categoryId = formData.get("categoryId") as string;
    const brandId = formData.get("brandId") as string;
    const customBrand = formData.get("customBrand") as string;
    const modelId = formData.get("modelId") as string;
    const subModelId = formData.get("subModelId") as string;
    const customModel = formData.get("customModel") as string;

    // Resolución de categoría
    if (subModelId) {
      const subModel = await prisma.aircraftSubModel.findUnique({
        where: { id: subModelId },
        select: { categoryOverride: true, model: { select: { defaultCategoryId: true } } }
      });
      if (subModel?.categoryOverride) categoryId = subModel.categoryOverride;
      else if (subModel?.model?.defaultCategoryId) categoryId = subModel.model.defaultCategoryId;
    } else if (modelId && modelId !== "CUSTOM_MODEL") {
      const model = await prisma.aircraftModel.findUnique({
        where: { id: modelId },
        select: { defaultCategoryId: true }
      });
      if (model?.defaultCategoryId) categoryId = model.defaultCategoryId;
    }

    let categoryExists = false;
    if (categoryId && categoryId.trim() !== "") {
      const validCategory = await prisma.aircraftCategory.findUnique({ where: { id: categoryId } });
      if (validCategory) categoryExists = true;
    }

    if (!categoryExists) {
      const fallbackCategory = await prisma.aircraftCategory.findFirst();
      if (fallbackCategory) categoryId = fallbackCategory.id;
      else throw new Error("No hay categorías registradas en la base de datos.");
    }

    const year = parseInt(formData.get("year") as string, 10);
    const totalTimeHours = parseInt(formData.get("totalTimeHours") as string, 10);
    const priceRaw = formData.get("price") as string;
    const priceOnRequest = formData.get("priceOnRequest") === "true";
    const city = formData.get("city") as string;
    const province = formData.get("province") as string;
    const description = formData.get("description") as string;
    
    // Validar AircraftCondition Enum
    const conditionRaw = (formData.get("condition") as string) || "USADO";
    const condition = (Object.values(AircraftCondition).includes(conditionRaw as AircraftCondition)
      ? conditionRaw
      : AircraftCondition.USADO) as AircraftCondition;

    const isEngineTypeRequired = categoryId === "MP" || categoryId === "BP" || categoryId === "M" || categoryId === "B";
    const rawEngineType = formData.get("engineType") as EngineType;
    const engineType = isEngineTypeRequired && rawEngineType ? rawEngineType : null;

    const financing = formData.get("financing") === "true";
    const trade = formData.get("trade") === "true";
    const rent = formData.get("rent") === "true";

    const avDescription = (formData.get("avDescription") as string) || "";
    const avAaptoifr = formData.get("avAaptoifr") === "true";
    const avAutopilot = formData.get("avAutopilot") === "true";

    const certified = formData.get("certified") === "true";
    const certDateRaw = formData.get("certDate") as string;
    const certDate = certDateRaw ? new Date(certDateRaw) : new Date();
    const plate = (formData.get("plate") as string) || "";

    const intDescription = (formData.get("intDescription") as string) || "";
    const extDescription = (formData.get("extDescription") as string) || "";
    const passengersRaw = formData.get("passengers") as string;
    const passengers = passengersRaw ? parseInt(passengersRaw, 10) : 0;
    const airconditioner = formData.get("airconditioner") === "true";
    const oxygen = formData.get("oxygen") === "true";

    const enginesJSON = formData.get("engines") as string;
    const propellersJSON = formData.get("propellers") as string;

    const engines = enginesJSON ? JSON.parse(enginesJSON) : [];
    const propellers = propellersJSON ? JSON.parse(propellersJSON) : [];

    const newAircraft = await prisma.aircraft.create({
      data: {
        sellerId: user.id,
        title,
        categoryId,
        brandId: brandId === "CUSTOM" ? null : brandId || null,
        customBrand: brandId === "CUSTOM" ? customBrand : null,
        modelId: modelId === "CUSTOM_MODEL" ? null : modelId || null,
        subModelId: subModelId || null,
        customModel: customModel || null,
        year,
        totalTimeHours,
        price: priceOnRequest || !priceRaw ? null : parseFloat(priceRaw),
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
        status: "ACTIVE",
        listingStartsAt: now,
        listingExpiresAt: expiresAt,
        images: {
          create: uploadedUrls.map((url, index) => ({ url, order: index })),
        },
        documents: {
          create: uploadedDocs.map((doc) => ({ name: doc.name, url: doc.url })),
        },
        engines: {
          create: engines.map((e: any) => ({
            brand: e.brand || null,
            model: e.model || null,
            engineHours: e.engineHours ? parseInt(e.engineHours, 10) : null,
            TBO: parseInt(e.TBO || "0", 10),
            DURG: e.DURG ? parseInt(e.DURG, 10) : null,
            description: e.description || null,
          })),
        },
        propeller: {
          create: propellers.map((p: any) => ({
            model: p.model || null,
            propellerHours: p.propellerHours ? parseInt(p.propellerHours, 10) : null,
            description: p.description || null,
          })),
        },
      },
    });

    // 📊 REGISTRO DE EVENTO EN ANALYTICS
    try {
      await prisma.analyticsEvent.create({
        data: {
          eventType: AnalyticsEventType.CREATE_AIRCRAFT_LISTING,
          userId: user.id,
          aircraftId: newAircraft.id,
        },
      });
    } catch (err) {
      console.error("Error al registrar evento CREATE_AIRCRAFT_LISTING:", err);
    }

    revalidatePath("/planes");
    redirectTarget = `/planes/plane-details/${newAircraft.id}`;
  } else {
    // Repuestos
    const title = formData.get("title") as string;
    const categoryId = formData.get("categoryId") as string;
    const brand = (formData.get("brand") as string) || "";
    const partNumber = formData.get("partNumber") as string;
    const priceRaw = formData.get("price") as string;
    const priceOnRequest = formData.get("priceOnRequest") === "true";
    const city = formData.get("city") as string;
    const province = formData.get("province") as string;
    const description = formData.get("description") as string;
    const inPesos = formData.get("inPesos") === "true";
    const stock = parseInt((formData.get("stock") as string) || "1", 10);
    const aircraftsJSON = formData.get("aircrafts") as string;
    const aircrafts = aircraftsJSON ? JSON.parse(aircraftsJSON) : [];

    // Validar SparepartCondition Enum
    const conditionRaw = (formData.get("condition") as string) || "NUEVO";
    const condition = (Object.values(SparepartCondition).includes(conditionRaw as SparepartCondition)
      ? conditionRaw
      : SparepartCondition.NUEVO) as SparepartCondition;

    const newSparePart = await prisma.sparePart.create({
      data: {
        sellerId: user.id,
        title,
        categoryId,
        brand,
        partNumber: partNumber || null,
        price: priceOnRequest || !priceRaw ? null : parseFloat(priceRaw),
        inPesos,
        stock,
        condition,
        city,
        province,
        description,
        aircrafts: aircrafts.length > 0 ? aircrafts : undefined,
        status: "ACTIVE",
        listingStartsAt: now,
        listingExpiresAt: expiresAt,
        images: {
          create: uploadedUrls.map((url, index) => ({ url, order: index })),
        },
      },
    });

    // 📊 REGISTRO DE EVENTO EN ANALYTICS
    try {
      await prisma.analyticsEvent.create({
        data: {
          eventType: AnalyticsEventType.CREATE_SPARE_PART_LISTING,
          userId: user.id,
          sparePartId: newSparePart.id,
        },
      });
    } catch (err) {
      console.error("Error al registrar evento CREATE_SPARE_PART_LISTING:", err);
    }

    revalidatePath("/spareparts");
    redirectTarget = `/spareparts/sparepart-details/${newSparePart.id}`;
  }

  // Redirección segura fuera de cualquier bloque interno
  if (redirectTarget) {
    redirect(redirectTarget);
  }
}

export async function sendManagedListingEmail(data: {
  name: string;
  whatsapp: string;
  itemType: string;
  description: string;
}) {
  // Solo usuarios logueados: evita que la action se use como relay de spam.
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Tenés que iniciar sesión." };
  }

  const name = String(data?.name ?? "").trim();
  const whatsapp = String(data?.whatsapp ?? "").trim();
  const description = String(data?.description ?? "").trim();
  const itemType = data?.itemType === "Repuesto" ? "Repuesto" : "Aeronave";

  if (!name || name.length > 100) {
    return { success: false, error: "Ingresá un nombre válido (máximo 100 caracteres)." };
  }
  if (!/^[\d\s()+-]{6,30}$/.test(whatsapp)) {
    return { success: false, error: "Ingresá un número de WhatsApp válido." };
  }
  if (description.length > 1000) {
    return { success: false, error: "Los detalles no pueden superar los 1000 caracteres." };
  }

  const supportEmail = getSupportEmail();
  if (!supportEmail) {
    console.error("Falta la variable SUPPORT_EMAIL: no se puede enviar la solicitud de publicación asistida.");
    return { success: false, error: "El servicio no está disponible en este momento." };
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [supportEmail],
      replyTo: user.email || undefined,
      subject: `Nueva solicitud de publicación asistida: ${itemType}`,
      html: `
        <h2>Nueva solicitud de publicación asistida</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
        <p><strong>WhatsApp:</strong> ${escapeHtml(whatsapp)}</p>
        <p><strong>Email de la cuenta:</strong> ${escapeHtml(user.email || "-")}</p>
        <p><strong>Tipo de Producto:</strong> ${itemType}</p>
        <p><strong>Detalles:</strong> ${escapeHtml(description).replace(/\n/g, "<br>")}</p>
      `,
    });

    if (error) {
      console.error("Error de Resend al enviar solicitud asistida:", error);
      return { success: false, error: "No se pudo enviar la solicitud." };
    }

    return { success: true };
  } catch (error) {
    console.error("Error enviando email:", error);
    return { success: false, error: "No se pudo enviar la solicitud." };
  }
}