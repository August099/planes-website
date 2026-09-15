"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { AircraftCondition, EngineType } from "@prisma/client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const resend = new Resend(process.env.RESEND_API_KEY);

// Configuración de límites para documentos
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 MB en bytes
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp"
];

export async function createListing(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  const listingType = formData.get("listingType") as string;
  const files = formData.getAll("files") as File[];

  // 1. Subida de imágenes al bucket "listings"
  const uploadedUrls: string[] = [];

  for (const file of files) {
    if (file && file.size > 0) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${listingType}/${user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from("listings")
        .upload(filePath, file);

      if (error) {
        console.error("Error al subir imagen a Supabase:", error);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from("listings")
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        uploadedUrls.push(publicUrlData.publicUrl);
      }
    }
  }

  // 2. Subida de documentos al NUEVO BUCKET "documents" con validaciones
  const documentFiles = formData.getAll("documents") as File[];
  const uploadedDocs: { name: string; url: string }[] = [];

  for (const docFile of documentFiles) {
    if (docFile && docFile.size > 0) {
      // Validación 1: Tamaño máximo (10 MB)
      if (docFile.size > MAX_DOC_SIZE) {
        console.warn(`El archivo ${docFile.name} excede el límite de 10 MB.`);
        continue;
      }

      // Validación 2: Tipos de archivo permitidos
      if (!ALLOWED_DOC_TYPES.includes(docFile.type)) {
        console.warn(`El archivo ${docFile.name} tiene un formato no permitido.`);
        continue;
      }

      const fileExt = docFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Subida al bucket independiente "documents"
      const { error } = await supabase.storage
        .from("documents")
        .upload(filePath, docFile);

      if (error) {
        console.error("Error al subir documento a Supabase:", error);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        uploadedDocs.push({
          name: docFile.name,
          url: publicUrlData.publicUrl,
        });
      }
    }
  }

// 3. Guardado en la base de datos
  if (listingType === "aircraft") {
    const title = formData.get("title") as string;
    let categoryId = formData.get("categoryId") as string;
    const brandId = formData.get("brandId") as string;
    const customBrand = formData.get("customBrand") as string;
    const modelId = formData.get("modelId") as string;
    const subModelId = formData.get("subModelId") as string;
    const customModel = formData.get("customModel") as string;

    // --- RESOLUCIÓN ROBUSTA DE CATEGORÍA ---
    // 1. Intentar obtener la categoría desde la base de datos según el submodelo o modelo
    if (subModelId) {
      const subModel = await prisma.aircraftSubModel.findUnique({
        where: { id: subModelId },
        select: { 
          categoryOverride: true, 
          model: { select: { defaultCategoryId: true } } 
        }
      });

      if (subModel?.categoryOverride) {
        categoryId = subModel.categoryOverride;
      } else if (subModel?.model?.defaultCategoryId) {
        categoryId = subModel.model.defaultCategoryId;
      }
    } else if (modelId && modelId !== "CUSTOM_MODEL") {
      const model = await prisma.aircraftModel.findUnique({
        where: { id: modelId },
        select: { defaultCategoryId: true }
      });

      if (model?.defaultCategoryId) {
        categoryId = model.defaultCategoryId;
      }
    }

    // 2. Si el modelo en la BD no tenía defaultCategoryId (o era null),
    // o si el categoryId recibido del cliente no existe en AircraftCategory, 
    // verificar que exista en la tabla AircraftCategory:
    let categoryExists = false;

    if (categoryId && categoryId.trim() !== "") {
      const validCategory = await prisma.aircraftCategory.findUnique({
        where: { id: categoryId }
      });
      if (validCategory) {
        categoryExists = true;
      }
    }

    // 3. Si sigue sin haber categoría válida, tomar la primera categoría disponible en la BD como respaldo
    if (!categoryExists) {
      const fallbackCategory = await prisma.aircraftCategory.findFirst();
      if (fallbackCategory) {
        categoryId = fallbackCategory.id;
      } else {
        throw new Error("No hay categorías registradas en la base de datos.");
      }
    }

    const year = parseInt(formData.get("year") as string, 10);
    const totalTimeHours = parseInt(formData.get("totalTimeHours") as string, 10);
    const priceRaw = formData.get("price") as string;
    const priceOnRequest = formData.get("priceOnRequest") === "true";
    const city = formData.get("city") as string;
    const province = formData.get("province") as string;
    const description = formData.get("description") as string;
    
    const condition = (formData.get("condition") as AircraftCondition) || "USADO";
    
    const isEngineTypeRequired = categoryId === "M" || categoryId === "B";
    const rawEngineType = formData.get("engineType") as EngineType;
    const engineType = isEngineTypeRequired && rawEngineType ? rawEngineType : null;

    const financing = formData.get("financing") === "true";
    const trade = formData.get("trade") === "true";
    const rent = formData.get("rent") === "true";

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
        status: "ACTIVE",
        images: {
          create: uploadedUrls.map((url, index) => ({
            url,
            order: index,
          })),
        },
        documents: {
          create: uploadedDocs.map((doc) => ({
            name: doc.name,
            url: doc.url,
          })),
        },
        engines: {
          create: engines.map((e: any) => ({
            brand: e.brand || null,
            model: e.model || null,
            engineHours: e.engineHours ? parseInt(e.engineHours, 10) : null,
            TBO: parseInt(e.TBO || "0", 10),
          })),
        },
        propeller: {
          create: propellers.map((p: any) => ({
            model: p.model || null,
            propellerHours: p.propellerHours ? parseInt(p.propellerHours, 10) : null,
          })),
        },
      },
    });

    revalidatePath("/planes");
    redirect(`/planes/plane-details/${newAircraft.id}`);
  } else {
    // Repuestos
    const title = formData.get("title") as string;
    const categoryId = formData.get("categoryId") as string;
    const partNumber = formData.get("partNumber") as string;
    const priceRaw = formData.get("price") as string;
    const priceOnRequest = formData.get("priceOnRequest") === "true";
    const city = formData.get("city") as string;
    const province = formData.get("province") as string;
    const description = formData.get("description") as string;
    const inPesos = formData.get("inPesos") === "true";
    const stock = parseInt((formData.get("stock") as string) || "1", 10);

    const newSparePart = await prisma.sparePart.create({
      data: {
        sellerId: user.id,
        title,
        categoryId,
        partNumber: partNumber || null,
        price: priceOnRequest || !priceRaw ? null : parseFloat(priceRaw),
        inPesos,
        stock,
        city,
        province,
        description,
        status: "ACTIVE",
        images: {
          create: uploadedUrls.map((url, index) => ({
            url,
            order: index,
          })),
        },
      },
    });

    revalidatePath("/spareparts");
    redirect(`/spareparts/sparepart-details/${newSparePart.id}`);
  }
}

export async function sendManagedListingEmail(data: {
  name: string;
  whatsapp: string;
  itemType: string;
  description: string;
}) {
  try {
    await resend.emails.send({
      from: "Ventas Aeronáuticas <contacto@tu-dominio.com>",
      to: ["soporte@tu-dominio.com"],
      subject: `Nueva solicitud de publicación asistida: ${data.itemType}`,
      html: `
        2 Nueva solicitud de publicación asistida</h2>
        <p><strong>Nombre:</strong> ${data.name}</p>
        <p><strong>WhatsApp:</strong> ${data.whatsapp}</p>
        <p><strong>Tipo de Producto:</strong> ${data.itemType}</p>
        <p><strong>Detalles:</strong> ${data.description}</p>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error enviando email:", error);
    return { success: false, error: error.message };
  }
}