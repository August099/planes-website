// Limpieza antes del lanzamiento (pedido del socio, 25/10/2026): borra TODO lo cargado por usuarios y
// conserva la configuración. Se borran todas las cuentas (también las de los admins) y todos los datos
// financieros (excepción explícita a la regla "los datos financieros no se borran", decidida por el socio).
//
// Se conserva: taxonomía (marcas, modelos, variantes, categorías, etiquetas), filtros, planes y grilla,
// guías, ajustes de cupos y de facturación, precios viejos, cupones (con el contador de usos en 0) y gastos
// fijos con su tipo de cambio. Las marcas y modelos cargados por usuarios (VA-190) quedan en la lista.
//
// Sin flags solo informa. --apply borra la base (un solo TRUNCATE, sin CASCADE: si una tabla que se conserva
// dependiera de una que se borra, falla en vez de arrastrarla). --storage borra además los archivos de los
// buckets de usuarios (no el de logos de marcas). Contra una base que no es local pide --confirm-production.
//
//   npx tsx --require ./scripts/stub-server-only.cjs scripts/wipe-user-data.ts [--apply] [--storage] [--confirm-production]
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const STORAGE = process.argv.includes("--storage");
const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}
const host = new URL(url).hostname;
const local = ["localhost", "127.0.0.1", "::1"].includes(host);
if ((APPLY || STORAGE) && !local && !process.argv.includes("--confirm-production")) {
  console.error(`La base (${host}) no es local: agregar --confirm-production para borrar.`);
  process.exit(1);
}

// Todo lo que se borra. Lo que no está acá se conserva.
const WIPE = [
  "Account", "AdBanner", "Aircraft", "AircraftDocument", "AircraftEngine", "AircraftImage", "AircraftPropeller",
  "AnalyticsEvent", "BillingProfile", "CouponUsage", "CreditLot", "EntityFilterValue", "Favorite", "Hangar",
  "HangarImage", "Invoice", "Lead", "ListingFunding", "ListingPriceChange", "ModerationAction", "PasswordResetToken",
  "Payment", "ProfilePage", "Purchase", "Question", "RateLimitEvent", "Report", "Republication", "Session",
  "SparePart", "SparePartImage", "SparePartLead", "Subscription", "Suggestion", "User", "VerificationToken",
  "WebhookEvent", "_AircraftToTag",
];
const USER_BUCKETS = ["listings", "avatars", "documents", "invoices"];

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function storageCounts() {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !key) return null;
  const supabase = createClient(supaUrl, key);
  const out: Record<string, string[]> = {};
  for (const bucket of USER_BUCKETS) {
    const paths: string[] = [];
    const walk = async (prefix: string) => {
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
        if (error) throw new Error(`${bucket}: ${error.message}`);
        for (const item of data ?? []) {
          const path = prefix ? `${prefix}/${item.name}` : item.name;
          if (item.id === null) await walk(path); // carpeta
          else paths.push(path);
        }
        if (!data || data.length < 1000) break;
      }
    };
    await walk("");
    out[bucket] = paths;
  }
  return { supabase, files: out, project: new URL(supaUrl).hostname.split(".")[0].slice(0, 4) + "…" };
}

async function main() {
  console.log(`Base: ${host}${local ? " (local)" : ""}`);
  const tables = (await prisma.$queryRaw<{ t: string }[]>`SELECT table_name AS t FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`).map((r) => r.t);
  const missing = WIPE.filter((t) => !tables.includes(t));
  if (missing.length) throw new Error(`No existen: ${missing.join(", ")}. Revisar la lista antes de seguir.`);

  const count = async (t: string) => Number((await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM "${t}"`))[0].n);
  const wipeRows = await Promise.all(WIPE.map(async (t) => ({ tabla: t, filas: await count(t) })));
  const keep = tables.filter((t) => !WIPE.includes(t));
  const keepRows = await Promise.all(keep.map(async (t) => ({ tabla: t, filas: await count(t) })));
  console.log("\nSe BORRA:");
  console.table(wipeRows.filter((r) => r.filas > 0));
  console.log(`(${wipeRows.filter((r) => r.filas === 0).length} tablas más ya están vacías)`);
  console.log("\nSe CONSERVA:");
  console.table(keepRows);

  const payments = await prisma.payment.count({ where: { status: "approved", liveMode: true } });
  const invoices = await prisma.invoice.count({ where: { status: "ISSUED" } });
  console.log(`\nFinancieros: ${payments} pagos aprobados en modo real y ${invoices} facturas emitidas en ARCA (se borran igual: decisión del socio).`);

  const storage = STORAGE ? await storageCounts() : null;
  if (STORAGE) {
    if (!storage) throw new Error("Para --storage faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
    console.log(`\nStorage del proyecto ${storage.project}:`);
    console.table(Object.entries(storage.files).map(([bucket, f]) => ({ bucket, archivos: f.length })));
  }

  if (!APPLY) return console.log("\nSolo informe. Para borrar la base: --apply (y --storage para los archivos).");

  await prisma.$transaction([
    prisma.$executeRawUnsafe(`TRUNCATE ${WIPE.map((t) => `"${t}"`).join(", ")}`),
    prisma.$executeRawUnsafe(`UPDATE "Coupon" SET "currentUses" = 0`),
    prisma.$executeRawUnsafe(`UPDATE "AircraftBrand" SET "sourceAircraftId" = NULL`),
    prisma.$executeRawUnsafe(`UPDATE "AircraftModel" SET "sourceAircraftId" = NULL`),
    prisma.$executeRawUnsafe(`UPDATE "QuotaSettings" SET "updatedById" = NULL`),
  ]);
  const left = await Promise.all(WIPE.map(count));
  console.log(`\nBase: ${left.every((n) => n === 0) ? "listo, todas las tablas de usuarios vacías" : "ATENCIÓN: quedaron filas"}.`);

  if (STORAGE && storage) {
    for (const [bucket, paths] of Object.entries(storage.files)) {
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await storage.supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
        if (error) throw new Error(`${bucket}: ${error.message}`);
      }
      console.log(`Storage ${bucket}: ${paths.length} archivos borrados.`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
