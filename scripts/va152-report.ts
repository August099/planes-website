// VA-152 · Informe previo al cambio de modelo (cupos fijos sin vencimiento). SOLO LEE: no escribe nada.
// Se corre ANTES de prisma migrate deploy: lee columnas que la migración va152_limpieza borra.
//
//   npx tsx --env-file=.env scripts/va152-report.ts        → base local (va_dev)
//
// Para el Preview o producción, exportar la URL de esa base en la terminal (no tocar el .env) y correr
// sin --env-file:
//   export RUNTIME_DATABASE_URL="<url de la base>"
//   npx tsx scripts/va152-report.ts
//
// Informa: planes y suscripciones (de quién), cuentas con más avisos activos que el cupo gratis,
// avisos por estado (vencidos y "pendiente de pago" pasarían a pausados), saldos y lotes de VA-150,
// compras, pagos y facturas (datos financieros que no se borran), precios por aviso y cupones.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.RUNTIME_DATABASE_URL;
if (!url) {
  console.error("Falta RUNTIME_DATABASE_URL (en el .env con --env-file=.env, o exportada en la terminal).");
  process.exit(1);
}
const FREE = { aircraft: 1, parts: 5 };
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const q = <T = Record<string, unknown>>(sql: string) => prisma.$queryRawUnsafe<T[]>(sql);

function section(title: string, rows: unknown[]) {
  console.log(`\n## ${title}`);
  if (rows.length === 0) console.log("(nada)");
  else console.table(rows);
}

async function main() {
  console.log(`Base: ${new URL(url!).hostname}  ·  ${new Date().toISOString()}  ·  cupo gratis ${FREE.aircraft} avión / ${FREE.parts} repuestos`);

  section(
    "Planes",
    await q(`select name, type, "billingType" cobro, price::text precio, "isActive" activo, "archivedAt" is not null archivado,
      (select count(*) from "Purchase" p where p."planId" = pl.id)::int compras,
      (select count(*) from "Subscription" s where s."planId" = pl.id)::int suscripciones
      from "Plan" pl order by "sortOrder", name`)
  );

  section(
    "Suscripciones (todas, de quién)",
    await q(`select u.email, pl.name plan, s.status estado, s.source origen, s."mpStatus" estado_mp, s."cancelAtPeriodEnd" cancela_al_final,
      to_char(s."currentPeriodEnd", 'YYYY-MM-DD') fin_periodo, to_char(s."graceUntil", 'YYYY-MM-DD') gracia,
      (select count(*) from "Payment" p where p."subscriptionId" = s.id and p.status = 'approved')::int cobros_aprobados
      from "Subscription" s join "User" u on u.id = s."userId" join "Plan" pl on pl.id = s."planId"
      order by s.status, pl.name, u.email`)
  );

  section(
    `Cuentas con más avisos activos que el cupo gratis (> ${FREE.aircraft} avión o > ${FREE.parts} repuestos)`,
    await q(`with a as (select "sellerId" uid, count(*) filter (where status = 'ACTIVE')::int n from "Aircraft" group by 1),
                  p as (select "sellerId" uid, count(*) filter (where status = 'ACTIVE')::int n from "SparePart" group by 1)
      select u.email, u."isAdmin" admin, coalesce(a.n, 0) aviones_activos, coalesce(p.n, 0) repuestos_activos,
        (select pl.name || ' (' || s.status || ', ' || s.source || ')' from "Subscription" s join "Plan" pl on pl.id = s."planId" where s."userId" = u.id) suscripcion
      from "User" u left join a on a.uid = u.id left join p on p.uid = u.id
      where coalesce(a.n, 0) > ${FREE.aircraft} or coalesce(p.n, 0) > ${FREE.parts}
      order by 3 desc, 4 desc`)
  );

  section(
    "Avisos por estado (vencido por fecha = ACTIVE con listingExpiresAt pasado)",
    await q(`select 'Aeronave' tipo, status::text estado, count(*)::int n, count(*) filter (where "listingExpiresAt" < now())::int vencido_por_fecha from "Aircraft" group by 2
      union all select 'Repuesto', status::text, count(*)::int, count(*) filter (where "listingExpiresAt" < now())::int from "SparePart" group by 2
      union all select 'Hangar (oculto)', status::text, count(*)::int, count(*) filter (where "listingExpiresAt" < now())::int from "Hangar" group by 2
      order by 1, 2`)
  );

  section(
    "Saldos y lotes (VA-89 / VA-150)",
    await q(`select 'Cuentas' que, count(*)::text valor from "User"
      union all select 'Con saldo de lanzamiento', count(*)::text from "User" where "launchBalanceGrantedAt" is not null
      union all select 'Saldo aviones / repuestos / hangares', sum("aircraftListingsBalance") || ' / ' || sum("sparePartsListingsBalance") || ' / ' || sum("hangarListingsBalance") from "User"
      union all select 'Lotes ' || source::text, count(*) || ' lotes, ' || coalesce(sum(remaining), 0) || ' sin usar' from "CreditLot" group by source
      union all select 'Registro de consumo ' || source::text, count(*) || ' filas, ' || count(*) filter (where "revertedAt" is not null) || ' revertidas' from "ListingFunding" group by source`)
  );

  section(
    "Compras (datos financieros: no se borran)",
    await q(`select case when "renewalKind" is not null then 'renovación' when "featuredKind" is not null then 'destacado'
        when "planId" is not null then 'plan ' || (select type::text from "Plan" where id = "planId") when "listingKind" is not null then 'aviso suelto' else 'otra' end tipo,
      "paymentStatus" estado, count(*)::int n, sum("finalPrice")::text total
      from "Purchase" group by 1, 2 order by 1, 2`)
  );
  section(
    "Pagos de Mercado Pago (no se borran)",
    await q(`select case when "subscriptionId" is not null then 'suscripción' else 'compra' end origen, status, "isTest" prueba, count(*)::int n, sum(amount)::text monto
      from "Payment" group by 1, 2, 3 order by 1, 2`)
  );
  section("Facturas (no se borran)", await q(`select kind, status, count(*)::int n, sum(total)::text total from "Invoice" group by 1, 2 order by 1, 2`));

  section(
    "Precios por aviso, renovación y destacados (configuración que deja de usarse)",
    await q(`select 'Precio suelto ' || kind::text que, amount::text valor from "ListingPrice"
      union all select 'Cambios de precio registrados', count(*)::text from "ListingPriceChange"
      union all select 'Renovación (% del precio suelto)', "renewalPercent"::text from "BillingSettings"
      union all select 'Destacado ' || days || ' días', amount::text from "FeaturedPrice"`)
  );
  section(
    "Cupones",
    await q(`select c.code, c.scope, c.type, c."isActive" activo, c."currentUses" usos,
      (select count(*) from "Purchase" p where p."couponId" = c.id)::int compras
      from "Coupon" c order by c."isActive" desc, c.code`)
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
