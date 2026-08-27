"use server";

import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Inicializar cliente de Supabase para subida de archivos al storage
const supabaseUrl = process.env.NEXY_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Inicializar cliente de Resend para envío de correos
const resend = new Resend(process.env.RESEND_API_KEY);

// Creación de publis
export async function createListing(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  const listingType = formData.get("listingType") as "aircraft" | "parts";

  const rawFiles = formData.getAll("files") as File[];
  const imageUrls: string[] = [];

  // Acá buena ayuda de shat (y docs de Supabase)
  for (const file of rawFiles) {
    if (file && file.size > 0) {
      // Generar un nombre único para evitar colisiones
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      // Convertir File a ArrayBuffer / Buffer para Node.js
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Subir al bucket 'listings' de Supabase
      const { data, error } = await supabase.storage
        .from("listings")
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error("Error subiendo imagen a Supabase:", error);
        throw new Error(`Error al subir la imagen ${file.name}`);
      }

      // Obtener la URL pública de la imagen
      const { data: publicUrlData } = supabase.storage
        .from("listings")
        .getPublicUrl(data.path);

      imageUrls.push(publicUrlData.publicUrl);
    }
  }

  // Guardado en la BD
  if (listingType === "aircraft") {
    const title = formData.get("title") as string;
    const categoryId = formData.get("categoryId") as string;
    const brandId = formData.get("brandId") as string;
    const customBrand = formData.get("customBrand") as string;
    const modelId = formData.get("modelId") as string;
    const customModel = formData.get("customModel") as string;
    const year = Number(formData.get("year"));
    const totalTimeHours = Number(formData.get("totalTimeHours"));
    const priceOnRequest = formData.get("priceOnRequest") === "true";
    const price = priceOnRequest ? null : Number(formData.get("price"));
    const city = formData.get("city") as string;
    const province = formData.get("province") as string;
    const description = formData.get("description") as string;
    const fuselageDescription = formData.get("fuselageDescription") as string;
    const fuselageModifications = formData.get("fuselageModifications") as string;
    const avionics = formData.get("avionics") as string;
    const extraEquipment = formData.get("extraEquipment") as string;

    const engines = JSON.parse((formData.get("engines") as string) || "[]");
    const propellers = JSON.parse((formData.get("propellers") as string) || "[]");

    // Concatenar las descripciones secundarias dentro de description
    const extraDetails = [
    fuselageDescription && `Fuselaje: ${fuselageDescription}`,
    fuselageModifications && `Modificaciones de Fuselaje: ${fuselageModifications}`,
    avionics && `Aviónica: ${avionics}`,
    extraEquipment && `Equipamiento Extra: ${extraEquipment}`,
    ]
    .filter(Boolean)
    .join("\n\n");

    const fullDescription = extraDetails
    ? `${description}\n\n--- DETALLES ADICIONALES ---\n${extraDetails}`
    : description;

    const newAircraft = await prisma.aircraft.create({
    data: {
        sellerId: user.id,
        title,
        categoryId,
        brandId: brandId && brandId !== "CUSTOM" ? brandId : null,
        customBrand: brandId === "CUSTOM" ? customBrand : null,
        modelId: modelId && modelId !== "CUSTOM" ? modelId : null,
        customModel: modelId === "CUSTOM" ? customModel : null,
        year,
        totalTimeHours,
        price, // Acepta null si es a consultar
        city,
        province,
        description: fullDescription,
        status: "ACTIVE",

        // Relación de Motores
        engines: {
        create: engines.map((eng: any) => ({
            brand: eng.brand || null,
            model: eng.model || null,
            engineHours: Number(eng.engineHours) || null,
            TBO: Number(eng.TBO) || 2000, // TBO es obligatorio capaz hay que revisar o consultar a zurdo de esto
        })),
        },

        // Relación de Hélices
        propeller: {
        create: propellers.map((prop: any) => ({
            model: prop.model || null,
            propellerHours: Number(prop.propellerHours) || null,
        })),
        },

        // Relación de Imágenes
        images: {
        create: imageUrls.map((url, index) => ({
            url,
            order: index,
        })),
        },
    },
    });

    redirect(`/planes/plane-details/${newAircraft.id}`);

  } else {
  // Repuestos
  const title = formData.get("title") as string;
  const categoryId = formData.get("categoryId") as string;
  const condition = formData.get("condition") as string;
  const brand = formData.get("brand") as string;
  const partNumber = formData.get("partNumber") as string;
  const priceOnRequest = formData.get("priceOnRequest") === "true";
  const price = priceOnRequest ? null : Number(formData.get("price"));
  const stock = Number(formData.get("stock")) || 1;
  const city = formData.get("city") as string;
  const province = formData.get("province") as string;
  const description = formData.get("description") as string;

  const newSparePart = await prisma.sparePart.create({
    data: {
      sellerId: user.id, 
      title,
      categoryId,
      partNumber: partNumber || null,
      price: price ? price : null,
      stock,
      city,
      province,
      description,
      status: "ACTIVE",
      
      // Guardar la marca y la condición dentro de attributes
      attributes: {
        condition: condition || "USADO",
        brand: brand || null,
      },

      // Relación de Imágenes
      images: {
        create: imageUrls.map((url, index) => ({
          url,
          order: index,
        })),
      },
    },
  });

  redirect(`/spareparts/sparepart-details/${newSparePart.id}`);
  }
}

// Envío de mail por asistencia
export async function sendManagedListingEmail(data: {
  name: string;
  whatsapp: string;
  itemType: string;
  description: string;
}) {
  try {
    const user = await getCurrentUser();

    await resend.emails.send({
      from: "Web Publicaciones <onboarding@resend.dev>", // Cambiar al dominio verificado (ver los pagos de Google)
      to: "atilasilvero@gmail.com", // Cambiar env cuando se ingrese en reend con el mail de la empresa
      subject: `Nueva Solicitud de Publicación Asistida: ${data.itemType}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #001F58; border-bottom: 2px solid #dc2626; padding-bottom: 8px;">Solicitud de Publicación Asistida</h2>
          <p>Se ha recibido un nuevo pedido de asistencia para publicar un producto:</p>
          
          <table style="width: 100%; text-align: left; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Nombre:</td>
              <td style="padding: 8px 0;">${data.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">WhatsApp:</td>
              <td style="padding: 8px 0;"><a href="https://wa.me/${data.whatsapp.replace(/[^0-9]/g, '')}" target="_blank">${data.whatsapp}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Producto:</td>
              <td style="padding: 8px 0;">${data.itemType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Usuario ID:</td>
              <td style="padding: 8px 0;">${user?.id || "No autenticado"}</td>
            </tr>
          </table>

          <div style="margin-top: 20px; background-color: #f8fafc; padding: 15px; border-radius: 8px;">
            <strong style="color: #001F58;">Descripción / Detalles:</strong>
            <p style="margin-top: 5px; color: #334155; whitespace: pre-wrap;">${data.description || "Sin descripción adicional."}</p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Error enviando email con Resend:", error);
    return { success: false, error: "No se pudo enviar la solicitud por correo." };
  }
}