# VA-152 · Informe de impacto: de cobro por aviso a cupos fijos (18/10/2026)

Spec: `docs/specs/VA-152-a-VA-164-lote-18-10.md`. Este informe es previo al código: qué se elimina,
qué cambia, qué queda en desuso y qué datos no se pueden borrar. Números de la base local (`va_dev`);
los del Preview y producción salen de `scripts/va152-report.ts` (solo lectura).

---

## 1. Hallazgos que cambian el alcance

- **Hoy nadie puede pausar un aviso ni marcarlo como vendido.** No existe la acción: el filtro
  "Pausados" del perfil (VA-97) solo muestra lo que el admin cambió a mano. Con cupos, **pausar,
  activar y marcar vendido** pasan a ser acciones centrales y hay que construirlas.
- **Los repuestos no tienen estado "pausado"** (`SparePartStatus` = pendiente de pago, activo,
  vencido, vendido). Se agrega `PAUSED`.
- **No existen mails ni avisos de vencimiento**, aunque la spec los menciona: no hay nada que borrar ahí.
  Sí hay textos de "45 días" en 8 lugares, un cron que devuelve vencimientos y el botón "Renovar".
- **Las suscripciones no aceptan cupones** (solo el pago único). "Un % del primer mes" necesita
  trabajo propio: Mercado Pago no permite un primer cobro distinto en el débito automático. Opciones:
  primer mes gratis (`free_trial` de MP) o un precio con descuento por N meses. Se decide al llegar.
- **La prueba final con pago real de AR$ 100** (runbook, paso 8) usa el plan "Pago de prueba", que es
  un pack. Sin packs, la prueba pasa a ser un **Pro de prueba** a AR$ 100 (oculto de `/plans`) o el
  Pro con su precio real y arrepentimiento. Se decide en VA-164.

---

## 2. Qué se elimina, qué cambia y qué queda en desuso

| Parte | Hoy | Con VA-152 |
|---|---|---|
| **Publicar** | Con saldo o suscripción, activo; si no, "pendiente de pago" y checkout | **Cambia:** activo si hay cupo; sin cupo, aviso al entrar al formulario y opción "Guardar como pausado" |
| **Checkout por aviso** (`?listing=`) | Paga un aviso pendiente | **Se elimina** |
| **Packs** (`AIRCRAFT_PACK`, `SPARE_PART_PACK`, `HANGAR_PACK`) | Saldo de publicaciones | **Se eliminan** de `/plans`, del checkout y del admin. Los planes quedan archivados (tienen compras) |
| **Renovación** (paga y gratis) | 45 días más, 70% del precio suelto | **Se elimina:** botón, `renewListingAction`, checkout `?renew=`, `lib/renewal.ts`, el % en `/admin/prices` |
| **Vencimiento** (`listingExpiresAt`) | 45 días; sin fecha con plan "sin vencimiento" | **Se elimina** como regla: filtros públicos, perfil ("vencidos"), PDF, favoritos, recomendaciones, cron (`syncListingExpiry`, devolución de vencimientos) |
| **"Pendiente de pago"** | Aviso creado sin saldo | **Desaparece.** Los que haya → pausados |
| **`ListingPrice`, `/admin/prices`** | Precio suelto y renovación | **En desuso:** la página sale del admin; la tabla y su historial (`ListingPriceChange`) quedan como registro |
| **Destacados** (`FeaturedPrice`, `featuredPerMonth`, `featuredCredits`) | Nunca se vendieron (VA-95 descartado) | **Se eliminan** (sin compras asociadas). `featuredUntil` de los avisos queda (el admin puede seguir destacando) |
| **Saldos** (`User.*ListingsBalance`) | Total de créditos | **Se eliminan** después de la migración de datos |
| **Lotes y registro de consumo (VA-150)** | Qué crédito pagó cada aviso, para revertir | **Se congelan** (sin escrituras nuevas). Se borran los lotes de lanzamiento, de admin y heredados (no vienen de una compra); quedan los de packs pagos y todo el registro de consumo, como historial de las compras viejas |
| **Promo de lanzamiento** (VA-89, `lib/promo.ts`, `lib/launch-balance.ts`) | 1 avión + 1 repuesto gratis hasta el 2/12 | **Se elimina.** La bienvenida y los carteles pasan a "Publicá gratis 1 avión y 5 repuestos. Sin vencimiento" |
| **Cupones** | Alcances: todo, aviones, repuestos, hangares, banners, destacados; tipo renovación | **Cambia:** solo planes (`ALL` = cualquier plan, `PLAN_PRO`, `PLAN_BUSINESS`). Los de otros alcances se desactivan, sin borrarse |
| **Suscripciones** | Plan Repuestos, Plan Aviones, Suscripción VA | **Cambia:** Pro y Empresarial (3 opciones). Las viejas, según tu decisión |
| **Baja de plan** (cron) | Vuelve a poner vencimiento a los avisos | **Cambia:** abre "Elegí cuáles quedan" (7 días) y después pausa los más nuevos |
| **Arrepentimiento** | Compras y suscripciones | **Solo suscripciones** (alta). Termina la suscripción y aplica la baja |
| **Cambio de plan** (VA-121) | Entre suscripciones, inmediato | **Igual,** sumando las opciones del Empresarial |
| **KPIs de ingresos** | Compras y suscripciones | Solo suscripciones (las compras viejas siguen en el historial) |

**Archivos más afectados** (para dimensionar): `app/publish/actions.ts`, `components/ui/PublishForm.tsx`,
`app/actions/listing-actions.ts`, `lib/payments/{checkout,activation,reversal,subscriptions,withdrawal,pending}.ts`,
`lib/{balances,renewal,promo,launch-balance,listing-prices,plan-offers,plans,plan-rules,subscriptions,listing-filters}.ts`,
`components/ui/profile/ProfileListings.tsx`, `app/checkout/page.tsx`, `app/plans`, `app/admin/{plans,prices,users,coupons,kpi}`,
`app/{faq,howtopublish,register,privacy}`, `lib/terms-content.tsx`, `app/api/cron/subscriptions`.
Lógica nueva en un solo lugar: **`lib/quota.ts`**.

---

## 3. Datos financieros que **no se borran**

| Tabla | Por qué |
|---|---|
| `Purchase` (incluidas las columnas `listingKind`, `renewalKind`, `featured*`, `couponId`) | Compras: historial de "Mis compras" y del admin |
| `Payment`, `Invoice`, `WebhookEvent`, `BillingProfile`, `BillingSettings` | Pagos de MP, facturas y notas de crédito, datos fiscales |
| `Subscription` (también las de planes viejos) | Historial de cobros y cortesías |
| `Plan` (los viejos, archivados) | Las compras y suscripciones apuntan a ellos |
| `Coupon`, `CouponUsage` | Usos ligados a compras |
| `CreditLot` de packs, `ListingFunding` | Qué se compró y qué se revirtió (arrepentimientos de VA-150) |
| `ListingPrice`, `ListingPriceChange` | Precios cobrados en su momento y quién los cambió |

**Se pueden borrar** (configuración o saldos sin compra detrás): `FeaturedPrice`, `Plan.noExpiry`,
`Plan.featuredPerMonth`, `Subscription.featuredCredits`, `BillingSettings.renewalPercent`,
`User.aircraftListingsBalance`, `User.sparePartsListingsBalance`, `User.hangarListingsBalance`,
`User.launchBalanceGrantedAt`, `listingExpiresAt` (aviones, repuestos, hangares), los lotes `LAUNCH`,
`ADMIN` y `LEGACY`, y los estados `EXPIRED` y `PENDING_PAYMENT` (una vez que no quede ningún aviso así).
Quedan: `listingStartsAt` (fecha de publicación) y `launchWelcomeSeenAt` (la bienvenida sigue).

---

## 4. Números de la base local (18/10)

| Qué | Local |
|---|---|
| Suscripciones | 2, las dos **cortesías** de Suscripción VA (atilasilvero@gmail.com y miltitosiviero@gmail.com), vigentes hasta el 13/10/2027 |
| Suscripciones pagas | 0 |
| Cuentas con más avisos activos que el cupo gratis | **8** de 17 (todas de prueba; la que más tiene, 6 aviones y 9 repuestos) |
| Avisos | 39 aviones, 48 repuestos y 4 hangares, todos activos; 0 vencidos y 0 pendientes de pago |
| Saldo de lanzamiento | 17 cuentas, 34 lotes sin usar |
| Compras | 6 del "Pago de prueba" (5 pendientes, 1 reembolsada), 1 pago y 1 factura (simulada, descartada) |
| Cupones | 0 |

**Preview y producción:** los corre tu socio con `scripts/va152-report.ts` (solo lee; instrucciones
en el encabezado del script).

---

## 5. Preguntas abiertas

1. **Empresarial, el tipo que no es ilimitado:** ¿tiene el cupo del Pro (por ejemplo, "repuestos
   ilimitados" = 3 aviones + repuestos ilimitados), el del Gratis (1 avión) o se define por opción en el admin?
   *Propuesta:* el del Pro, editable en el admin por opción (quedan como 3 filas de plan).
2. **Beneficios:** ¿Pro y Empresarial incluyen la **Página VA** y las **métricas de vendedor** (VA-151)?
   *Propuesta:* los dos, como interruptores del plan (ya existen).
3. **Cuentas que hoy superan el cupo gratis:** ¿se respetan sus avisos (no pierden ninguno, pero no
   publican ni activan otro hasta quedar dentro del cupo) o se les aplica "Elegí cuáles quedan" con 7 días?
   *Propuesta:* respetarlos (menos fricción en el lanzamiento).
4. **Suscripciones viejas:** con el informe del Preview y de producción. *Propuesta:* las cortesías
   pasan a Pro o Empresarial de cortesía; las pagas, al equivalente o canceladas con aviso.
5. **Hangares** (ocultos): mismo esquema, cupo gratis propuesto de 1 (editable). No se ve hasta que se publiquen.

---

## 6. Modelo de datos propuesto

**Planes:** se reutiliza `Plan`. Columna nueva `tier` (`PRO` | `BUSINESS`; null = plan viejo, archivado).
`aircraftListingsCount` / `sparePartsListingsCount` + `isUnlimited*` pasan a ser el **cupo de avisos
activos**. El Empresarial son **3 filas** (solo aviones, solo repuestos o ambos ilimitados), cada una
con su precio: así el débito, el cambio de plan (VA-121) y el cambio de opción usan el código de hoy
sin tocarlo. El configurador de `/plans` elige la fila según las casillas. Sin precio (0), el plan
queda inactivo y `/plans` muestra solo el Gratis.

**Cupo gratis:** tabla `QuotaSettings` (una fila): 1 avión, 5 repuestos, 1 hangar y 7 días para elegir.
Editable en `/admin/plans`.

**Baja con exceso:** tabla `QuotaReview` (motivo, cupo nuevo, plazo, resolución). Mientras está
abierta, los avisos siguen activos y el perfil pide elegir; vencido el plazo, el cron pausa los más
nuevos (por fecha de publicación) y la cierra. Queda como historial.

**Estados:** `SparePartStatus` suma `PAUSED`. Al final se quitan `EXPIRED` y `PENDING_PAYMENT` de los
dos enums (el moderado de VA-154 se agrega en esa tarea).

**Cupo** (`lib/quota.ts`): cuenta solo `ACTIVE`; la verificación y el alta (o la activación) van en una
transacción que bloquea la fila del usuario (`SELECT … FOR UPDATE`), así dos altas simultáneas no
superan el cupo.

### Migración 1 · `va152_cupos` (creada, **sin aplicar**)

`prisma/migrations/20261018052204_va152_cupos/migration.sql`: solo agrega (enum `PlanTier`, columna
`Plan.tier`, `PAUSED` en repuestos, alcances de cupón `PLAN_PRO` y `PLAN_BUSINESS`, tablas
`QuotaSettings` y `QuotaReview`). No borra ni cambia datos.

### Script de datos · `scripts/va152-migrate-data.ts` (a escribir, con modo informe)

En orden, primero informa y con `--apply` escribe:
1. Avisos vencidos (por estado o por fecha) y "pendiente de pago" → `PAUSED`.
2. Planes viejos (incluido "Pago de prueba") → archivados. Crea Pro y las 3 opciones del Empresarial
   con precio 0 e inactivos (los montos se cargan en el admin).
3. Suscripciones viejas → según tu decisión (pregunta 4).
4. Cupones con alcance de avisos, destacados, hangares o banners, y los de renovación → inactivos.
5. Lotes `LAUNCH`, `ADMIN` y `LEGACY` → se borran; los de packs quedan.
6. Fila de `QuotaSettings` con 1 / 5 / 1 / 7.

### Migración 2 · `va152_limpieza` (borrador; se crea después del código y del script de datos)

```sql
-- Vencimiento
DROP INDEX "Aircraft_status_listingExpiresAt_createdAt_idx";
DROP INDEX "Hangar_status_listingExpiresAt_createdAt_idx";
ALTER TABLE "Aircraft"  DROP COLUMN "listingExpiresAt";
ALTER TABLE "SparePart" DROP COLUMN "listingExpiresAt";
ALTER TABLE "Hangar"    DROP COLUMN "listingExpiresAt";
CREATE INDEX "Aircraft_status_createdAt_idx" ON "Aircraft"("status", "createdAt");
CREATE INDEX "Hangar_status_createdAt_idx"   ON "Hangar"("status", "createdAt");

-- Estados sin EXPIRED ni PENDING_PAYMENT (el script de datos ya no deja ninguno)
ALTER TYPE "AircraftStatus" RENAME TO "AircraftStatus_old";
CREATE TYPE "AircraftStatus" AS ENUM ('ACTIVE', 'PAUSED', 'SOLD');
ALTER TABLE "Aircraft" ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "AircraftStatus" USING "status"::text::"AircraftStatus",
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "Hangar" ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "AircraftStatus" USING "status"::text::"AircraftStatus",
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "AircraftStatus_old";

ALTER TYPE "SparePartStatus" RENAME TO "SparePartStatus_old";
CREATE TYPE "SparePartStatus" AS ENUM ('ACTIVE', 'PAUSED', 'SOLD');
ALTER TABLE "SparePart" ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SparePartStatus" USING "status"::text::"SparePartStatus",
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "SparePartStatus_old";

-- Saldos (VA-89 / VA-150)
ALTER TABLE "User" DROP COLUMN "aircraftListingsBalance", DROP COLUMN "sparePartsListingsBalance",
  DROP COLUMN "hangarListingsBalance", DROP COLUMN "launchBalanceGrantedAt";

-- Vencimiento por plan, destacados y renovación
ALTER TABLE "Plan" DROP COLUMN "noExpiry", DROP COLUMN "featuredPerMonth";
ALTER TABLE "Subscription" DROP COLUMN "featuredCredits";
ALTER TABLE "BillingSettings" DROP COLUMN "renewalPercent";
DROP TABLE "FeaturedPrice";
```

Prisma la va a generar sola a partir del schema; este borrador es para que veas qué se borra.
