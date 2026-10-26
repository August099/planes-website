// Dos avisos de demostración (26/10/2026), para que el sitio no esté vacío en la prueba de seguridad:
// - Cuenta gratis (plan Base) "Martín Gómez" con un Laviasa PA-25 Puelche.
// - Cuenta Broker "Aerorepuestos del Litoral" (plan Broker / Empresa · Todo ilimitado, bonificado por
//   6 meses, como lo asigna el admin) con una cubierta Goodyear.
//
//   npx tsx scripts/seed-demo-listings.ts                     → dry-run: muestra qué haría
//   npx tsx scripts/seed-demo-listings.ts --apply             → escribe
//   ... --allow-remote   para cualquier base que no sea local (Preview o producción)
//   ... --no-upload      no copia las fotos: usa las URLs de origen (solo pruebas locales)
//
// Usa RUNTIME_DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del entorno (las
// variables exportadas mandan sobre el .env). Las fotos se descargan de su URL pública y se suben al
// bucket "listings" del proyecto de NEXT_PUBLIC_SUPABASE_URL, en la carpeta de cada cuenta (como el
// formulario). Las contraseñas se generan al azar y se muestran solo en la consola, una vez.
// Si las cuentas ya existen, no hace nada (se puede correr dos veces sin duplicar).
import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const allowRemote = process.argv.includes("--allow-remote");
const noUpload = process.argv.includes("--no-upload");
const url = process.env.RUNTIME_DATABASE_URL;

if (!url) throw new Error("Falta RUNTIME_DATABASE_URL.");
const host = new URL(url.replace(/^postgres(ql)?:/, "http:")).hostname;
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);
if (!isLocal && !allowRemote) throw new Error(`La base (${host}) no es local: para escribir ahí pasá --allow-remote.`);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

// Fotos públicas del Storage (avisos de prueba del Preview).
const PHOTOS = "https://kwbrfpuqheppidlplqzl.supabase.co/storage/v1/object/public/listings";
const AIRCRAFT_PHOTOS = [
  `${PHOTOS}/aircraft/cmu4v7smt0000aov7u60fjco3/1790358644748-rzvd1d.jpg`,
  `${PHOTOS}/aircraft/cmu4v7smt0000aov7u60fjco3/1790358646482-y9xs7p.jpg`,
  `${PHOTOS}/aircraft/cmu4v7smt0000aov7u60fjco3/1790358646781-hkor2n.jpg`,
];
const PART_PHOTOS = [
  `${PHOTOS}/parts/cmu4v7smt0000aov7u60fjco3/1789615670100-m1qokt.webp`,
  `${PHOTOS}/parts/cmu4v7smt0000aov7u60fjco3/1789615671239-455ibr.jpg`,
];

// Dominio reservado (RFC 2606): nunca recibe mails de verdad.
const FREE_EMAIL = "martin.gomez.demo@example.com";
const BROKER_EMAIL = "ventas.demo@aerorepuestoslitoral.example.com";

const password = () => randomBytes(12).toString("base64url");

async function copyPhotos(urls: string[], folder: string): Promise<string[]> {
  if (noUpload) return urls;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  const supabase = createClient(supabaseUrl, key);
  const out: string[] = [];
  for (const src of urls) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`No se pudo descargar ${src} (${res.status}).`);
    const ext = src.split(".").pop()!.toLowerCase();
    const path = `${folder}/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
    const { error } = await supabase.storage
      .from("listings")
      .upload(path, Buffer.from(await res.arrayBuffer()), { contentType: ext === "webp" ? "image/webp" : "image/jpeg" });
    if (error) throw new Error(`No se pudo subir ${path}: ${error.message}`);
    out.push(supabase.storage.from("listings").getPublicUrl(path).data.publicUrl);
  }
  return out;
}

async function main() {
  console.log(`Base: ${host} · ${apply ? "ESCRIBE" : "dry-run (sin --apply no escribe)"}${noUpload ? " · sin subir fotos" : ""}\n`);

  // Datos de la taxonomía, por nombre (los ids cambian entre bases).
  const model = await prisma.aircraftModel.findFirst({
    where: { name: "PA-25 Puelche", brand: { name: { equals: "LAVIASA", mode: "insensitive" } } },
    select: { id: true, brandId: true },
  });
  const agricola = await prisma.aircraftCategory.findUnique({ where: { id: "A" }, select: { id: true } });
  const tires = await prisma.category.findFirst({
    where: { name: "Cubiertas y Cámaras", children: { none: {} } },
    select: { id: true },
  });
  // El nombre del plan cambia entre bases: se busca por lo que incluye (Broker con todo ilimitado) y, si no
  // hay, el Broker con más cupo.
  const brokerPlans = await prisma.plan.findMany({
    where: { tier: "BUSINESS", billingType: "SUBSCRIPTION", archivedAt: null, isActive: true },
    select: { id: true, name: true, isUnlimitedAircraft: true, isUnlimitedSpareParts: true, sparePartsListingsCount: true },
  });
  const brokerPlan =
    brokerPlans.find((p) => p.isUnlimitedAircraft && p.isUnlimitedSpareParts) ??
    brokerPlans.find((p) => p.isUnlimitedSpareParts) ??
    [...brokerPlans].sort((x, y) => y.sparePartsListingsCount - x.sparePartsListingsCount)[0];
  if (!brokerPlan) {
    const all = await prisma.plan.findMany({ select: { name: true, tier: true, billingType: true, isActive: true, archivedAt: true } });
    console.log("Planes en esta base:", all.map((p) => `${p.name} (${p.tier ?? "sin tier"}, ${p.billingType}${p.isActive ? "" : ", inactivo"}${p.archivedAt ? ", archivado" : ""})`).join(" | "));
  }
  const missing = [
    !model && "modelo LAVIASA PA-25 Puelche",
    !agricola && "categoría de aeronave A (Agrícola)",
    !tires && "categoría de repuesto Cubiertas y Cámaras",
    !brokerPlan && "un plan Broker / Empresa de suscripción activo",
  ].filter(Boolean);
  if (missing.length) throw new Error(`No encontré en esta base: ${missing.join(", ")}.`);

  const existing = await prisma.user.findMany({ where: { email: { in: [FREE_EMAIL, BROKER_EMAIL] } }, select: { email: true } });
  if (existing.length) {
    console.log(`Ya existen: ${existing.map((u) => u.email).join(", ")}. No hago nada.`);
    return;
  }

  console.log("Va a crear:");
  console.log(`- Cuenta gratis ${FREE_EMAIL} con "Laviasa PA-25 Puelche 1978" (${AIRCRAFT_PHOTOS.length} fotos).`);
  console.log(`- Cuenta Broker ${BROKER_EMAIL} (${brokerPlan!.name}, bonificado 6 meses) con "Cubierta Goodyear Flight Custom III 6.00-6 6PR" (${PART_PHOTOS.length} fotos).`);
  if (!apply) return;

  const now = new Date();
  const freePass = password();
  const brokerPass = password();

  // --- Cuenta gratis
  const free = await prisma.user.create({
    data: {
      name: "Martín Gómez",
      email: FREE_EMAIL,
      emailVerified: now,
      passwordHash: await bcrypt.hash(freePass, 10),
      phone: "+5493456400001",
      city: "Chajarí",
      province: "Entre Ríos",
      userType: "PARTICULAR",
      userTypeConfirmed: true,
      launchWelcomeSeenAt: now,
    },
    select: { id: true },
  });
  const aircraftImages = await copyPhotos(AIRCRAFT_PHOTOS, `aircraft/${free.id}`);
  const aircraft = await prisma.aircraft.create({
    data: {
      sellerId: free.id,
      title: "Laviasa PA-25 Puelche 1978",
      brandId: model!.brandId,
      modelId: model!.id,
      categoryId: agricola!.id,
      year: 1978,
      totalTimeHours: 6850,
      price: 98000,
      negotiable: true,
      condition: "USADO",
      engineType: "PISTON",
      plate: "LV-MKG",
      certified: true,
      certDate: new Date("2027-03-15"), // "Habilitado hasta" en el detalle
      passengers: 1,
      city: "Chajarí",
      province: "Entre Ríos",
      latitude: -30.7505,
      longitude: -57.9864,
      description:
        "Puelche en actividad hasta la última campaña, siempre en hangar. Anual vigente hasta marzo de 2027, papeles al día y libros completos desde fábrica. Se entrega listo para trabajar.",
      extDescription: "Pintura original con retoques en 2019. Sin corrosión en la estructura ni en el tren.",
      intDescription: "Butaca y tapizados nuevos (2024). Arneses de 4 puntos.",
      avDescription: "Radio VHF Icom IC-A220, transponder Garmin GTX 327, GPS Garmin aera 660.",
      agEquipment: "Tolva de 1.100 litros, barra de pulverización con 40 picos y bomba eólica. Bandereador satelital.",
      extraEquipment: "Funda de cabina y de hélice.",
      status: "ACTIVE",
      listingStartsAt: now,
      lastPublishedAt: now,
      images: { create: aircraftImages.map((u, order) => ({ url: u, order })) },
      engines: {
        create: [{ brand: "Lycoming", model: "O-540-B2B5", horsepower: 235, engineHours: 420, TBO: 2000, description: "Overhaul en taller habilitado en 2021." }],
      },
      propeller: { create: [{ brand: "Hartzell", model: "HC-C2YK", propellerHours: 420, description: "Paso variable, recorrida junto con el motor." }] },
    },
    select: { id: true },
  });

  // --- Cuenta Broker
  const broker = await prisma.user.create({
    data: {
      name: "Aerorepuestos del Litoral",
      businessName: "Aerorepuestos del Litoral",
      email: BROKER_EMAIL,
      emailVerified: now,
      passwordHash: await bcrypt.hash(brokerPass, 10),
      phone: "+5493434000002",
      whatsapp: "5493434000002",
      city: "Paraná",
      province: "Entre Ríos",
      userType: "RESELLER",
      userTypeConfirmed: true,
      launchWelcomeSeenAt: now,
      bio: "Repuestos e insumos para aviación general y agrícola. Envíos a todo el país.",
    },
    select: { id: true },
  });
  const until = new Date(now);
  until.setMonth(until.getMonth() + 6);
  await prisma.subscription.create({
    data: {
      userId: broker.id,
      planId: brokerPlan!.id,
      status: "ACTIVE",
      source: "MANUAL",
      currentPeriodStart: now,
      currentPeriodEnd: until,
      note: "Cuenta de demostración (prueba de seguridad, 26/10/2026)",
    },
  });
  const partImages = await copyPhotos(PART_PHOTOS, `parts/${broker.id}`);
  const part = await prisma.sparePart.create({
    data: {
      sellerId: broker.id,
      title: "Cubierta Goodyear Flight Custom III 6.00-6 6PR",
      partNumber: "606C61-8",
      brand: "Goodyear",
      categoryId: tires!.id,
      condition: "NUEVO",
      stock: 8,
      price: 185000,
      inPesos: true,
      aircrafts: ["Cessna 150", "Cessna 172", "Piper PA-28", "Aero Boero AB-115"],
      city: "Paraná",
      province: "Entre Ríos",
      latitude: -31.7413,
      longitude: -60.5115,
      description:
        "Cubierta principal nueva, sin uso, con certificado de origen. Medida 6.00-6 de 6 telas, para tren principal. Precio por unidad; consultá por el par.",
      status: "ACTIVE",
      listingStartsAt: now,
      lastPublishedAt: now,
      images: { create: partImages.map((u, order) => ({ url: u, order })) },
    },
    select: { id: true },
  });

  console.log("\nListo.");
  console.log(`- Avión:    /aircraft/${aircraft.id}`);
  console.log(`- Repuesto: /spareparts/sparepart-details/${part.id}`);
  console.log("\nContraseñas (se muestran una sola vez; guardalas en tu gestor):");
  console.log(`- ${FREE_EMAIL}: ${freePass}`);
  console.log(`- ${BROKER_EMAIL}: ${brokerPass}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
