// Borra lo que creó scripts/seed-demo-listings.ts (28/10/2026, pedido del socio): las dos cuentas de
// demostración (por su email @example.com, nunca otra), sus avisos con las fotos del Storage, el plan
// bonificado del Broker y sus eventos de analíticas.
//
//   npx tsx scripts/remove-demo-listings.ts                   → dry-run: muestra qué borraría
//   npx tsx scripts/remove-demo-listings.ts --apply           → borra
//   ... --allow-remote   para cualquier base que no sea local (Preview o producción)
//
// Usa RUNTIME_DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del entorno, como el seed.
// No toca datos financieros: si alguna de las dos cuentas tiene compras, pagos, usos de cupón o una
// suscripción que no sea bonificada, no borra nada y avisa.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const allowRemote = process.argv.includes("--allow-remote");
const url = process.env.RUNTIME_DATABASE_URL;

if (!url) throw new Error("Falta RUNTIME_DATABASE_URL.");
const host = new URL(url.replace(/^postgres(ql)?:/, "http:")).hostname;
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);
if (!isLocal && !allowRemote) throw new Error(`La base (${host}) no es local: para borrar ahí pasá --allow-remote.`);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

// Los mismos del seed (dominio reservado, RFC 2606).
const DEMO_EMAILS = ["martin.gomez.demo@example.com", "ventas.demo@aerorepuestoslitoral.example.com"];

/** Ruta dentro del bucket "listings" a partir de la URL pública (null si es de otro lado). */
function listingsPath(publicUrl: string): string | null {
  const marker = "/storage/v1/object/public/listings/";
  const i = publicUrl.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(publicUrl.slice(i + marker.length).split("?")[0]);
}

async function main() {
  console.log(`Base: ${host} · ${apply ? "BORRA" : "dry-run (sin --apply no borra)"}\n`);

  const users = await prisma.user.findMany({
    where: { email: { in: DEMO_EMAILS } },
    select: {
      id: true,
      email: true,
      name: true,
      aircrafts: { select: { id: true, title: true, images: { select: { url: true } } } },
      spareParts: { select: { id: true, title: true, images: { select: { url: true } } } },
      Subscription: { select: { id: true, source: true } },
      _count: { select: { purchases: true, couponUsages: true, hangars: true, adBanners: true } },
    },
  });
  if (users.length === 0) {
    console.log("No hay cuentas de demostración. Nada para borrar.");
    return;
  }

  const ids = users.map((u) => u.id);
  const payments = await prisma.payment.count({ where: { subscription: { userId: { in: ids } } } });
  const blocked = users.filter((u) => u._count.purchases > 0 || u._count.couponUsages > 0 || u._count.hangars > 0 || u._count.adBanners > 0 || (u.Subscription !== null && u.Subscription.source !== "MANUAL"));
  if (blocked.length || payments > 0) {
    console.log(`No borro nada: ${blocked.map((u) => u.email).join(", ") || "alguna cuenta"} tiene compras, pagos, cupones, hangares, banners o una suscripción paga.`);
    return;
  }

  const photos: string[] = [];
  for (const u of users) {
    console.log(`${u.name} <${u.email}>`);
    for (const a of u.aircrafts) console.log(`  aeronave: ${a.title} (${a.images.length} fotos)`);
    for (const p of u.spareParts) console.log(`  repuesto: ${p.title} (${p.images.length} fotos)`);
    if (u.Subscription) console.log("  plan bonificado");
    for (const img of [...u.aircrafts.flatMap((a) => a.images), ...u.spareParts.flatMap((p) => p.images)]) {
      // Solo las copias de la carpeta de la cuenta: con --no-upload el seed apunta a fotos de otros avisos
      // (el Preview y producción comparten el bucket), y esas no se tocan.
      const path = listingsPath(img.url);
      if (path && (path.startsWith(`aircraft/${u.id}/`) || path.startsWith(`parts/${u.id}/`))) photos.push(path);
    }
  }
  console.log(`\nFotos en el Storage: ${photos.length}`);
  if (!apply) {
    console.log("\nDry-run: para borrar, volvé a correrlo con --apply.");
    return;
  }

  const aircraftIds = users.flatMap((u) => u.aircrafts.map((a) => a.id));
  const partIds = users.flatMap((u) => u.spareParts.map((p) => p.id));
  await prisma.$transaction(async (tx) => {
    // Lo que apunta a los avisos o a las cuentas sin borrado en cascada.
    await tx.favorite.deleteMany({ where: { OR: [{ userId: { in: ids } }, { aircraftId: { in: aircraftIds } }, { sparePartId: { in: partIds } }] } });
    await tx.report.deleteMany({ where: { OR: [{ userId: { in: ids } }, { aircraftId: { in: aircraftIds } }, { sparePartId: { in: partIds } }] } });
    await tx.question.deleteMany({ where: { OR: [{ userId: { in: ids } }, { aircraftId: { in: aircraftIds } }, { sparePartId: { in: partIds } }] } });
    await tx.analyticsEvent.deleteMany({ where: { OR: [{ userId: { in: ids } }, { aircraftId: { in: aircraftIds } }, { sparePartId: { in: partIds } }] } });
    await tx.aircraft.deleteMany({ where: { id: { in: aircraftIds } } });
    await tx.sparePart.deleteMany({ where: { id: { in: partIds } } });
    await tx.subscription.deleteMany({ where: { userId: { in: ids }, source: "MANUAL" } });
    await tx.user.deleteMany({ where: { id: { in: ids }, email: { in: DEMO_EMAILS } } });
  });
  console.log(`Borradas ${users.length} cuentas, ${aircraftIds.length} aeronaves y ${partIds.length} repuestos.`);

  if (photos.length) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !key) {
      console.log("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY: las fotos quedaron en el Storage.");
      return;
    }
    const { error } = await createClient(supabaseUrl, key).storage.from("listings").remove(photos);
    console.log(error ? `No se pudieron borrar las fotos: ${error.message}` : `Borradas ${photos.length} fotos del Storage.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
