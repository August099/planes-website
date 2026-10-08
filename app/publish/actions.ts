"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { EMAIL_FROM, escapeHtml, getSupportEmail } from "@/lib/mail";
import { AnalyticsEventType } from "@prisma/client";
import {
  listingSchema,
  toFieldErrors,
  type AircraftListing,
  type SparePartListing,
  type ListingInput,
  type ListingResult,
} from "@/lib/listing-schema";
import { assertListingOwner } from "@/lib/listing-auth";
import {
  createUploadTargets,
  pathFromPublicUrl,
  removeUploads,
  verifyUploads,
  type ListingType,
  type UploadRequest,
} from "@/lib/listing-uploads";

const resend = new Resend(process.env.RESEND_API_KEY);

// La categoría por defecto del modelo o de la variante tiene prioridad (igual que en el
// formulario). Si la categoría resultante no existe, se rechaza (VA-22: antes se usaba
// la primera categoría que existiera).
async function resolveAircraftCategory(data: AircraftListing): Promise<string | null> {
  let categoryId = data.categoryId;
  if (data.subModelId) {
    const subModel = await prisma.aircraftSubModel.findUnique({
      where: { id: data.subModelId },
      select: { categoryOverride: true, model: { select: { defaultCategoryId: true } } },
    });
    if (subModel?.categoryOverride) categoryId = subModel.categoryOverride;
    else if (subModel?.model?.defaultCategoryId) categoryId = subModel.model.defaultCategoryId;
  } else if (data.modelId) {
    const model = await prisma.aircraftModel.findUnique({
      where: { id: data.modelId },
      select: { defaultCategoryId: true },
    });
    if (model?.defaultCategoryId) categoryId = model.defaultCategoryId;
  }
  const category = await prisma.aircraftCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
  return category?.id ?? null;
}

// La categoría de un repuesto tiene que existir y ser la más específica (sin hijas).
async function isValidSparePartCategory(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { _count: { select: { children: true } } },
  });
  return !!category && category._count.children === 0;
}

// Doble clic o reintento: si el mismo vendedor creó un aviso con el mismo título en los
// últimos 2 minutos, se devuelve ese en vez de crear otro.
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

async function findRecentDuplicate(listingType: ListingType, sellerId: string, title: string) {
  const where = { sellerId, title, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } };
  const found =
    listingType === "aircraft"
      ? await prisma.aircraft.findFirst({ where, select: { id: true } })
      : await prisma.sparePart.findFirst({ where, select: { id: true } });
  return found?.id ?? null;
}

const listingUrl = (listingType: ListingType, id: string) =>
  listingType === "aircraft" ? `/planes/plane-details/${id}` : `/spareparts/sparepart-details/${id}`;

// Campos propios (sin relaciones ni estado/vigencia), iguales en el alta y en la edición.
function aircraftFields(data: AircraftListing, categoryId: string) {
  return {
    title: data.title,
    categoryId,
    brandId: data.brandId || null,
    customBrand: data.brandId ? null : data.customBrand || null,
    modelId: data.modelId || null,
    subModelId: data.subModelId || null,
    customModel: data.modelId ? null : data.customModel || null,
    year: data.year,
    totalTimeHours: data.totalTimeHours,
    price: data.priceOnRequest ? null : data.price ?? null,
    city: data.city,
    province: data.province,
    description: data.description,
    condition: data.condition,
    // VA-21: el selector solo aparece en MP/BP; el resto queda sin dato hasta VA-43.
    engineType: categoryId === "MP" || categoryId === "BP" ? data.engineType ?? null : null,
    financing: data.financing,
    trade: data.trade,
    rent: data.rent,
    avDescription: data.avDescription,
    avAaptoifr: data.avAaptoifr,
    avAutopilot: data.avAutopilot,
    certified: data.certified,
    certDate: data.certDate ? new Date(data.certDate) : null,
    plate: data.plate || null,
    intDescription: data.intDescription || null,
    extDescription: data.extDescription || null,
    passengers: data.passengers ?? null,
    airconditioner: data.airconditioner,
    oxygen: data.oxygen,
  };
}

function engineRows(data: AircraftListing) {
  return data.engines.map((e) => ({
    brand: e.brand || null,
    model: e.model || null,
    engineHours: e.engineHours ?? null,
    TBO: e.TBO,
    DURG: e.DURG ?? null,
    description: e.description || null,
  }));
}

function propellerRows(data: AircraftListing) {
  return data.propellers.map((p) => ({
    // La marca va dentro del modelo hasta que tenga su propio campo (VA-54).
    model: [p.brand, p.model].filter(Boolean).join(" ") || null,
    propellerHours: p.propellerHours ?? null,
    description: p.description || null,
  }));
}

function sparePartFields(data: SparePartListing) {
  return {
    title: data.title,
    categoryId: data.categoryId,
    brand: data.brand || null,
    partNumber: data.partNumber || null,
    price: data.priceOnRequest ? null : data.price ?? null,
    inPesos: data.inPesos,
    stock: data.stock,
    condition: data.condition,
    city: data.city,
    province: data.province,
    description: data.description,
    aircrafts: data.aircrafts,
  };
}

/**
 * Paso 1 de la publicación: firma una URL de subida por archivo. El navegador sube
 * las fotos y documentos directo a Supabase y después llama a createListing con las rutas.
 */
export async function prepareListingUploads(input: { listingType: ListingType; files: UploadRequest[] }) {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false as const, error: "Tenés que iniciar sesión." };

  const listingType: ListingType = input?.listingType === "parts" ? "parts" : "aircraft";
  const files = Array.isArray(input?.files) ? input.files : [];
  return createUploadTargets(user.id, listingType, files);
}

/** Borra archivos subidos que no llegaron a una publicación (error o cancelación). */
export async function discardListingUploads(input: {
  listingType: ListingType;
  images: string[];
  documents: string[];
}) {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false as const };
  const listingType: ListingType = input?.listingType === "parts" ? "parts" : "aircraft";
  await removeUploads(user.id, listingType, input?.images ?? [], input?.documents ?? []);
  return { ok: true as const };
}

/**
 * Paso 2: crea la publicación con los datos del formulario y las rutas de los archivos
 * ya subidos. Devuelve { ok: true, id, url } o { ok: false, error, fieldErrors }.
 */
export async function createListing(input: ListingInput): Promise<ListingResult> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };

  const parsed = listingSchema.safeParse(input);
  const listingType: ListingType = input?.listingType === "parts" ? "parts" : "aircraft";
  const imagePaths = Array.isArray(input?.images) ? input.images.filter((p) => typeof p === "string") : [];
  const rawDocs = input?.listingType === "aircraft" && Array.isArray(input.documents) ? input.documents : [];
  const docPaths = rawDocs.map((d) => d?.path).filter((p): p is string => typeof p === "string");

  // Ante cualquier error, se borran los archivos ya subidos para no dejar huérfanos.
  const fail = async (result: Extract<ListingResult, { ok: false }>) => {
    await removeUploads(user.id!, listingType, imagePaths, docPaths);
    return result;
  };

  if (!parsed.success) {
    return fail({ ok: false, error: "Revisá los campos marcados.", fieldErrors: toFieldErrors(parsed.error) });
  }
  const data = parsed.data;

  const duplicateId = await findRecentDuplicate(listingType, user.id, data.title);
  if (duplicateId) {
    // Ya existe: los archivos de este segundo envío sobran.
    await removeUploads(user.id, listingType, imagePaths, docPaths);
    return { ok: true, id: duplicateId, url: listingUrl(listingType, duplicateId) };
  }

  const uploads = await verifyUploads(
    user.id,
    listingType,
    data.images,
    data.listingType === "aircraft" ? data.documents : []
  );
  if (!uploads.ok) return fail({ ok: false, error: uploads.error, fieldErrors: { images: uploads.error } });

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(now.getDate() + 45);

  try {
    let id: string;

    if (data.listingType === "aircraft") {
      const categoryId = await resolveAircraftCategory(data);
      if (!categoryId) {
        return fail({ ok: false, error: "Seleccioná una categoría válida.", fieldErrors: { categoryId: "Seleccioná una categoría válida." } });
      }

      const aircraft = await prisma.aircraft.create({
        data: {
          sellerId: user.id,
          ...aircraftFields(data, categoryId),
          status: "ACTIVE",
          listingStartsAt: now,
          listingExpiresAt: expiresAt,
          images: { create: uploads.imageUrls.map((url, order) => ({ url, order })) },
          documents: { create: uploads.documents },
          engines: { create: engineRows(data) },
          propeller: { create: propellerRows(data) },
        },
        select: { id: true },
      });
      id = aircraft.id;
    } else {
      if (!(await isValidSparePartCategory(data.categoryId))) {
        const msg = "Seleccioná la categoría más específica.";
        return fail({ ok: false, error: msg, fieldErrors: { categoryId: msg } });
      }

      const sparePart = await prisma.sparePart.create({
        data: {
          sellerId: user.id,
          ...sparePartFields(data),
          status: "ACTIVE",
          listingStartsAt: now,
          listingExpiresAt: expiresAt,
          images: { create: uploads.imageUrls.map((url, order) => ({ url, order })) },
        },
        select: { id: true },
      });
      id = sparePart.id;
    }

    try {
      await prisma.analyticsEvent.create({
        data: {
          eventType:
            listingType === "aircraft"
              ? AnalyticsEventType.CREATE_AIRCRAFT_LISTING
              : AnalyticsEventType.CREATE_SPARE_PART_LISTING,
          userId: user.id,
          ...(listingType === "aircraft" ? { aircraftId: id } : { sparePartId: id }),
        },
      });
    } catch (err) {
      console.error("Error al registrar el evento de alta:", err);
    }

    revalidatePath("/");
    revalidatePath(listingType === "aircraft" ? "/planes" : "/spareparts");
    return { ok: true, id, url: listingUrl(listingType, id) };
  } catch (error) {
    console.error("Error al crear la publicación:", error);
    return fail({ ok: false, error: "No se pudo guardar la publicación. Probá de nuevo." });
  }
}

/**
 * Edición completa con el mismo formulario del alta (VA-30, punto 7).
 * En "images" y "documents" llegan mezcladas las URLs de los archivos que ya tenía el
 * aviso (se conservan) y las rutas de los nuevos que el navegador acaba de subir.
 */
export async function updateListing(id: string, input: ListingInput): Promise<ListingResult> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };

  const listingType: ListingType = input?.listingType === "parts" ? "parts" : "aircraft";
  const incomingImages = Array.isArray(input?.images) ? input.images.filter((p) => typeof p === "string") : [];
  const incomingDocs = input?.listingType === "aircraft" && Array.isArray(input.documents) ? input.documents : [];

  // Dueño (o admin). Si no lo es, no se toca nada, ni siquiera los archivos.
  try {
    await assertListingOwner(id, listingType === "aircraft" ? "aircraft" : "sparepart");
  } catch {
    return { ok: false, error: "No tenés permiso para editar esta publicación." };
  }

  let sellerId: string;
  let imageUrls: string[];
  let docUrls: string[] = [];
  if (listingType === "aircraft") {
    const aircraft = await prisma.aircraft.findUnique({
      where: { id },
      select: { sellerId: true, images: { select: { url: true } }, documents: { select: { url: true } } },
    });
    if (!aircraft) return { ok: false, error: "La publicación no existe." };
    sellerId = aircraft.sellerId;
    imageUrls = aircraft.images.map((i) => i.url);
    docUrls = aircraft.documents.map((d) => d.url);
  } else {
    const sparePart = await prisma.sparePart.findUnique({
      where: { id },
      select: { sellerId: true, images: { select: { url: true } } },
    });
    if (!sparePart) return { ok: false, error: "La publicación no existe." };
    sellerId = sparePart.sellerId;
    imageUrls = sparePart.images.map((i) => i.url);
  }

  const currentImages = new Set(imageUrls);
  const currentDocs = new Set(docUrls);
  const newImagePaths = incomingImages.filter((p) => !currentImages.has(p));
  const newDocPaths = incomingDocs.map((d) => d?.path).filter((p): p is string => typeof p === "string" && !currentDocs.has(p));

  // Ante cualquier error, se borran solo los archivos NUEVOS de esta edición.
  const fail = async (result: Extract<ListingResult, { ok: false }>) => {
    await removeUploads(user.id!, listingType, newImagePaths, newDocPaths);
    return result;
  };

  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) {
    return fail({ ok: false, error: "Revisá los campos marcados.", fieldErrors: toFieldErrors(parsed.error) });
  }
  const data = parsed.data;

  const uploads = await verifyUploads(
    user.id,
    listingType,
    newImagePaths,
    data.listingType === "aircraft" ? data.documents.filter((d) => !currentDocs.has(d.path)) : []
  );
  if (!uploads.ok) return fail({ ok: false, error: uploads.error, fieldErrors: { images: uploads.error } });

  // Orden final: cada URL existente queda igual; cada ruta nueva se reemplaza por su URL pública.
  const newUrlByPath = new Map(newImagePaths.map((path, i) => [path, uploads.imageUrls[i]]));
  const finalImages = data.images.map((entry) => (currentImages.has(entry) ? entry : newUrlByPath.get(entry)!));
  const removedImages = [...currentImages].filter((url) => !finalImages.includes(url));

  try {
    if (data.listingType === "aircraft") {
      const categoryId = await resolveAircraftCategory(data);
      if (!categoryId) {
        return fail({ ok: false, error: "Seleccioná una categoría válida.", fieldErrors: { categoryId: "Seleccioná una categoría válida." } });
      }
      const keptDocs = data.documents.filter((d) => currentDocs.has(d.path)).map((d) => d.path);
      const removedDocs = [...currentDocs].filter((url) => !keptDocs.includes(url));

      await prisma.$transaction([
        prisma.aircraftImage.deleteMany({ where: { aircraftId: id } }),
        prisma.aircraftEngine.deleteMany({ where: { aircraftId: id } }),
        prisma.aircraftPropeller.deleteMany({ where: { aircraftId: id } }),
        prisma.aircraftDocument.deleteMany({ where: { aircraftId: id, url: { notIn: keptDocs } } }),
        prisma.aircraft.update({
          where: { id },
          data: {
            ...aircraftFields(data, categoryId),
            images: { create: finalImages.map((url, order) => ({ url, order })) },
            documents: { create: uploads.documents },
            engines: { create: engineRows(data) },
            propeller: { create: propellerRows(data) },
          },
        }),
      ]);

      // Recién con la base actualizada se borran del bucket los archivos que se quitaron.
      await removeUploads(
        sellerId,
        listingType,
        removedImages.map((url) => pathFromPublicUrl("image", url)).filter((p): p is string => !!p),
        removedDocs.map((url) => pathFromPublicUrl("document", url)).filter((p): p is string => !!p)
      );
      revalidatePath(`/planes/plane-details/${id}`);
      revalidatePath("/planes");
    } else {
      if (!(await isValidSparePartCategory(data.categoryId))) {
        const msg = "Seleccioná la categoría más específica.";
        return fail({ ok: false, error: msg, fieldErrors: { categoryId: msg } });
      }

      await prisma.$transaction([
        prisma.sparePartImage.deleteMany({ where: { sparePartId: id } }),
        prisma.sparePart.update({
          where: { id },
          data: {
            ...sparePartFields(data),
            images: { create: finalImages.map((url, order) => ({ url, order })) },
          },
        }),
      ]);

      await removeUploads(
        sellerId,
        listingType,
        removedImages.map((url) => pathFromPublicUrl("image", url)).filter((p): p is string => !!p),
        []
      );
      revalidatePath(`/spareparts/sparepart-details/${id}`);
      revalidatePath("/spareparts");
    }

    revalidatePath("/");
    revalidatePath("/profile");
    return { ok: true, id, url: listingUrl(listingType, id) };
  } catch (error) {
    console.error("Error al editar la publicación:", error);
    return fail({ ok: false, error: "No se pudo guardar la publicación. Probá de nuevo." });
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